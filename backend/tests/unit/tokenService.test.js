import { jest } from '@jest/globals';
import { sequelize } from '../../config/db.js';
import { User } from '../../models/index.js';
import {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../../services/tokenService.js';

const fakeReq = { headers: { 'user-agent': 'jest' }, ip: '127.0.0.1' };

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

const makeUser = () =>
  User.create({ name: 'T', email: `t${Math.random()}@x.com`, password: 'hash', role: 'user' });

describe('access tokens', () => {
  it('signs and verifies an access token', async () => {
    const user = await makeUser();
    const token = signAccessToken(user);
    const payload = verifyAccessToken(token);
    expect(payload.id).toBe(user.id);
    expect(payload.type).toBe('access');
  });

  it('rejects a tampered token', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow();
  });
});

describe('refresh-token rotation', () => {
  it('rotates to a new token and revokes the old one', async () => {
    const user = await makeUser();
    const raw = await issueRefreshToken(user, fakeReq);
    const rotated = await rotateRefreshToken(raw, fakeReq);
    expect(rotated.ok).toBe(true);
    expect(rotated.raw).not.toBe(raw);

    // Old token no longer valid.
    const reused = await rotateRefreshToken(raw, fakeReq);
    expect(reused.ok).toBe(false);
    expect(reused.reason).toBe('reuse');
  });

  it('revokes the whole family when a rotated token is reused (theft detection)', async () => {
    const user = await makeUser();
    const raw = await issueRefreshToken(user, fakeReq);
    const rotated = await rotateRefreshToken(raw, fakeReq);
    // Reuse the ALREADY-rotated original -> family revoked.
    await rotateRefreshToken(raw, fakeReq);
    const afterFamilyRevoke = await rotateRefreshToken(rotated.raw, fakeReq);
    expect(afterFamilyRevoke.ok).toBe(false);
  });

  it('rejects an unknown / revoked token', async () => {
    const user = await makeUser();
    const raw = await issueRefreshToken(user, fakeReq);
    await revokeRefreshToken(raw);
    const result = await rotateRefreshToken(raw, fakeReq);
    expect(result.ok).toBe(false);
  });
});
