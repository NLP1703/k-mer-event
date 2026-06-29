import request from 'supertest';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/db.js';
import app from '../../app.js';
import { User } from '../../models/index.js';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

const register = (agent, overrides = {}) =>
  agent.post('/api/auth/register').send({
    name: 'Alice',
    telephone: '0600000000',
    email: `alice${Math.random()}@x.com`,
    password: 'Password123',
    ...overrides,
  });

describe('POST /api/auth/register', () => {
  it('creates a user, returns an access token and sets a refresh cookie', async () => {
    const agent = request.agent(app);
    const res = await register(agent);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toContain('alice');
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('kmer_rt='))).toBe(true);
    expect(cookies.some((c) => /HttpOnly/i.test(c))).toBe(true);
  });

  it('rejects a weak password (422)', async () => {
    const res = await register(request.agent(app), { password: 'short' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and rejects invalid ones', async () => {
    const email = `bob${Math.random()}@x.com`;
    await User.create({ name: 'Bob', email, password: await bcrypt.hash('Secret123', 12), role: 'user' });

    const ok = await request(app).post('/api/auth/login').send({ email, password: 'Secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();

    const bad = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('refuses login for a soft-deleted account (403) before issuing a token', async () => {
    const email = `gone${Math.random()}@x.com`;
    await User.create({
      name: 'Gone',
      email,
      password: await bcrypt.hash('Secret123', 12),
      role: 'user',
      is_deleted: true,
    });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Secret123' });
    expect(res.status).toBe(403);
    expect(res.body.accessToken).toBeUndefined();
  });

  it('locks out after repeated failures (brute-force protection)', async () => {
    const email = `victim${Math.random()}@x.com`;
    await User.create({ name: 'V', email, password: await bcrypt.hash('Secret123', 12), role: 'user' });
    const agent = request.agent(app);
    let last;
    for (let i = 0; i < 6; i += 1) {
      last = await agent.post('/api/auth/login').send({ email, password: 'wrong' });
    }
    expect(last.status).toBe(429);
    expect(last.headers['retry-after']).toBeTruthy();
  });
});

describe('refresh + logout flow', () => {
  it('refreshes the access token using the cookie, then logout revokes it', async () => {
    const agent = request.agent(app);
    await register(agent);

    const refreshed = await agent.post('/api/auth/refresh').send();
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    const out = await agent.post('/api/auth/logout').send();
    expect(out.status).toBe(200);

    // After logout the (now revoked + cleared) cookie can no longer refresh.
    const afterLogout = await agent.post('/api/auth/refresh').send();
    expect(afterLogout.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('requires a bearer token and returns the current user', async () => {
    const agent = request.agent(app);
    const reg = await register(agent);
    const token = reg.body.accessToken;

    const unauth = await request(app).get('/api/auth/me');
    expect(unauth.status).toBe(401);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(reg.body.user.email);
  });
});
