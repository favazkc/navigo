process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { makeToken } = require('./helpers/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

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

async function createProject(owner, extraMembers = []) {
  return Project.create({
    name: 'Test Project',
    owner: owner._id,
    members: [{ user: owner._id, role: 'Admin' }, ...extraMembers],
  });
}

async function createTask(project, creator, overrides = {}) {
  return Task.create({
    project: project._id,
    title: 'Test Task',
    status: 'Backlog',
    priority: 'Medium',
    createdBy: creator._id,
    order: 0,
    ...overrides,
  });
}

// ── GET /api/v1/projects/:id/tasks ───────────────────────────────────────────

describe('GET /api/v1/projects/:id/tasks', () => {
  it('returns tasks for a project member', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    await createTask(project, user, { title: 'Task A' });
    await createTask(project, user, { title: 'Task B' });

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 403 for non-members', async () => {
    const { user } = await createUser();
    const { token: otherToken } = await createUser();
    const project = await createProject(user);

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/v1/projects/:id/tasks ──────────────────────────────────────────

describe('POST /api/v1/projects/:id/tasks', () => {
  it('creates a task for a project member', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Task' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('New Task');
    expect(res.body.data.status).toBe('Backlog');
    expect(res.body.data.priority).toBe('Medium');
  });

  it('returns 422 when title is missing', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Backlog' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid status', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Task', status: 'NotAStatus' });

    expect(res.status).toBe(422);
  });

  it('auto-increments order within a status column', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    await createTask(project, user, { status: 'Backlog', order: 0 });

    const res = await request(app)
      .post(`/api/v1/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Second', status: 'Backlog' });

    expect(res.status).toBe(201);
    expect(res.body.data.order).toBe(1);
  });
});

// ── GET /api/v1/projects/:id/tasks/:taskId ────────────────────────────────────

describe('GET /api/v1/projects/:id/tasks/:taskId', () => {
  it('returns a single task', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    const task = await createTask(project, user, { title: 'Solo Task' });

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Solo Task');
  });

  it('returns 404 for unknown task', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    const fakeId = '000000000000000000000001';

    const res = await request(app)
      .get(`/api/v1/projects/${project._id}/tasks/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ── PUT /api/v1/projects/:id/tasks/:taskId ────────────────────────────────────

describe('PUT /api/v1/projects/:id/tasks/:taskId', () => {
  it('allows the creator to update title', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    const task = await createTask(project, user, { title: 'Old Title' });

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('New Title');
  });

  it('allows Admin to update any task', async () => {
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
    const task = await createTask(project, member, { title: 'Member Task' });

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}/tasks/${task._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Admin Renamed');
  });

  it("prevents a non-creator, non-assignee Member from editing another member's task", async () => {
    const { user: owner } = await createUser();
    const { user: member1 } = await createUser();
    const { user: member2, token: member2Token } = await createUser();

    const project = await Project.create({
      name: 'P',
      owner: owner._id,
      members: [
        { user: owner._id, role: 'Admin' },
        { user: member1._id, role: 'Member' },
        { user: member2._id, role: 'Member' },
      ],
    });
    // Task created by member1, assigned to member1
    const task = await createTask(project, member1, { assignee: member1._id });

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member2Token}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a task that does not exist', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    const fakeId = '000000000000000000000001';

    const res = await request(app)
      .put(`/api/v1/projects/${project._id}/tasks/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'X' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/v1/projects/:id/tasks/:taskId ─────────────────────────────────

describe('DELETE /api/v1/projects/:id/tasks/:taskId', () => {
  it('allows project Admin to delete a task', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    const task = await createTask(project, user);

    const res = await request(app)
      .delete(`/api/v1/projects/${project._id}/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = await Task.findById(task._id);
    expect(found).toBeNull();
  });

  it('prevents a plain Member from deleting a task', async () => {
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
    const task = await createTask(project, owner);

    const res = await request(app)
      .delete(`/api/v1/projects/${project._id}/tasks/${task._id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/v1/projects/:id/tasks/reorder ─────────────────────────────────

describe('PATCH /api/v1/projects/:id/tasks/reorder', () => {
  it('reorders tasks for a member', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);
    const t1 = await createTask(project, user, { status: 'Backlog', order: 0 });
    const t2 = await createTask(project, user, { status: 'Backlog', order: 1 });

    const res = await request(app)
      .patch(`/api/v1/projects/${project._id}/tasks/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        updates: [
          { id: t1._id.toString(), order: 1 },
          { id: t2._id.toString(), order: 0 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when updates array is empty', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user);

    const res = await request(app)
      .patch(`/api/v1/projects/${project._id}/tasks/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ updates: [] });

    expect(res.status).toBe(400);
  });
});
