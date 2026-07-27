process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const User = require('../models/User');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

describe('POST /api/v1/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.systemRole).toBe('user');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email already exists', async () => {
    await User.create({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice2', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('completes an invited stub account (password=null)', async () => {
    // Simulate invite: stub user with no password
    await User.create({ name: '', email: 'stub@example.com', password: null });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Stub', email: 'stub@example.com', password: 'newpassword' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('stub@example.com');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
  });

  it('returns a token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bob@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bob@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bob@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a valid token', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Carol', email: 'carol@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${reg.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Auth middleware', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not.a.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
