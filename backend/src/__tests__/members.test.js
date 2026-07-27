process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { makeToken } = require('./helpers/auth');
const User = require('../models/User');
const Project = require('../models/Project');

// Mock email service so tests don't require SendGrid credentials
jest.mock('../services/email.service', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(true),
}));

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUser(overrides = {}) {
  const user = await User.create({
    name: 'User',
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    systemRole: 'user',
    ...overrides,
  });
  return { user, token: makeToken(user) };
}

async function createProjectWithMembers(owner, extraMembers = []) {
  return Project.create({
    name: 'Test Project',
    owner: owner._id,
    members: [{ user: owner._id, role: 'Admin' }, ...extraMembers],
  });
}

// ── GET /api/v1/projects/:id/members ─────────────────────────────────────────

describe('GET /api/v1/projects/:id/members', () => {
  it('returns member list for a project member', async () => {
    const { user, token } = await createUser();
    const project = await createProjectWithMembers(user);

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].role).toBe('Admin');
  });

  it('returns 403 for non-members', async () => {
    const { user } = await createUser();
    const { token: otherToken } = await createUser();
    const project = await createProjectWithMembers(user);

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/v1/projects/:id/members/invite ──────────────────────────────────

describe('POST /api/v1/projects/:id/members/invite', () => {
  it('Admin can invite a new user by email', async () => {
    const { user, token } = await createUser();
    const project = await createProjectWithMembers(user);

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/members/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newmember@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when the user is already a member', async () => {
    const { user, token } = await createUser();
    const project = await createProjectWithMembers(user);

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/members/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for an invalid email', async () => {
    const { user, token } = await createUser();
    const project = await createProjectWithMembers(user);

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/members/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
  });

  it('returns 403 for plain Member role', async () => {
    const { user: owner } = await createUser();
    const { user: member, token: memberToken } = await createUser();

    const project = await Project.create({
      name: 'P',
      owner: owner._id,
      members: [
        { user: owner._id, role: 'Admin' },
        { user: member._id, role: 'Member' },
      ],
    });

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/members/invite`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'someone@example.com' });

    expect(res.status).toBe(403);
  });
});

// ── PUT /api/v1/projects/:id/members/:userId/role ─────────────────────────────

describe('PUT /api/v1/projects/:id/members/:userId/role', () => {
  it('Admin can change a member role', async () => {
    const { user: admin, token: adminToken } = await createUser();
    const { user: member } = await createUser();

    const project = await Project.create({
      name: 'P',
      owner: admin._id,
      members: [
        { user: admin._id, role: 'Admin' },
        { user: member._id, role: 'Member' },
      ],
    });

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}/members/${member._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'Admin' });

    expect(res.status).toBe(200);
    const updated = res.body.data.find((m) => m.user.toString() === member._id.toString());
    expect(updated.role).toBe('Admin');
  });

  it('returns 404 when the member is not in the project', async () => {
    const { user: admin, token: adminToken } = await createUser();
    const { user: stranger } = await createUser();
    const project = await createProjectWithMembers(admin);

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}/members/${stranger._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'Admin' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/v1/projects/:id/members/:userId ───────────────────────────────

describe('DELETE /api/v1/projects/:id/members/:userId', () => {
  it('Admin can remove a member', async () => {
    const { user: admin, token: adminToken } = await createUser();
    const { user: member } = await createUser();

    const project = await Project.create({
      name: 'P',
      owner: admin._id,
      members: [
        { user: admin._id, role: 'Admin' },
        { user: member._id, role: 'Member' },
      ],
    });

    const res = await request(app)
      .delete(`/api/v1/projects/${project._id}/members/${member._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const updated = await Project.findById(project._id);
    const stillMember = updated.members.some((m) => m.user.toString() === member._id.toString());
    expect(stillMember).toBe(false);
  });

  it('returns 400 when trying to remove the owner', async () => {
    const { user: admin, token: adminToken } = await createUser();
    const project = await createProjectWithMembers(admin);

    const res = await request(app)
      .delete(`/api/v1/projects/${project._id}/members/${admin._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
