process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { makeToken } = require('./helpers/auth');
const User = require('../models/User');
const Project = require('../models/Project');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUser(overrides = {}) {
  const user = await User.create({
    name: 'Test User',
    email: `user-${Date.now()}@example.com`,
    password: 'password123',
    systemRole: 'user',
    ...overrides,
  });
  return { user, token: makeToken(user) };
}

async function createAdminUser(overrides = {}) {
  return createUser({ systemRole: 'admin', ...overrides });
}

async function createProject(owner, overrides = {}) {
  return Project.create({
    name: 'Test Project',
    owner: owner._id,
    members: [{ user: owner._id, role: 'Admin' }],
    ...overrides,
  });
}

// ── GET /api/v1/projects ──────────────────────────────────────────────────────

describe('GET /api/v1/projects', () => {
  it('returns only projects the user belongs to', async () => {
    const { user, token } = await createAdminUser();
    const { user: other } = await createAdminUser({ email: 'other@example.com' });

    await createProject(user, { name: 'Mine' });
    await createProject(other, { name: 'Not Mine' });

    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Mine');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/v1/projects ─────────────────────────────────────────────────────

describe('POST /api/v1/projects', () => {
  it('allows system admin to create a project', async () => {
    const { token } = await createAdminUser();

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Project' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Project');
  });

  it('returns 403 for non-admin users', async () => {
    const { token } = await createUser();

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Project' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when name is missing', async () => {
    const { token } = await createAdminUser();

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name here' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/v1/projects/:id ──────────────────────────────────────────────────

describe('GET /api/v1/projects/:id', () => {
  it('returns the project for a member', async () => {
    const { user, token } = await createAdminUser();
    const project = await createProject(user);

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(project._id.toString());
    expect(res.body.data.status).toBeDefined();
  });

  it('returns 403 for non-members', async () => {
    const { user } = await createAdminUser();
    const { token: otherToken } = await createUser({ email: 'other@example.com' });
    const project = await createProject(user);

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown project id', async () => {
    const { token } = await createAdminUser();
    const fakeId = '000000000000000000000001';

    const res = await request(app)
      .get(`/api/v1/projects/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ── PUT /api/v1/projects/:id ──────────────────────────────────────────────────

describe('PUT /api/v1/projects/:id', () => {
  it('allows project Admin to update name', async () => {
    const { user, token } = await createAdminUser();
    const project = await createProject(user);

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
  });

  it('returns 403 for a plain Member', async () => {
    const { user } = await createAdminUser();
    const { user: member, token: memberToken } = await createUser({ email: 'member@example.com' });

    const project = await Project.create({
      name: 'Test',
      owner: user._id,
      members: [
        { user: user._id, role: 'Admin' },
        { user: member._id, role: 'Member' },
      ],
    });

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/v1/projects/:id ───────────────────────────────────────────────

describe('DELETE /api/v1/projects/:id', () => {
  it('allows project Admin to delete the project', async () => {
    const { user, token } = await createAdminUser();
    const project = await createProject(user);

    const res = await request(app)
      .delete(`/api/v1/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await Project.findById(project._id);
    expect(found).toBeNull();
  });
});

// ── Project status derivation ─────────────────────────────────────────────────

describe('Project status', () => {
  it('returns "To Do" status when project has no tasks', async () => {
    const { user, token } = await createAdminUser();
    const project = await createProject(user);

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.status).toBe('To Do');
  });
});
