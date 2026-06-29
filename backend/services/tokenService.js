import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { config } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';

// ─────────────────────────────────────────────────────────────────────────────
// Access tokens (stateless JWT, short-lived)
// ─────────────────────────────────────────────────────────────────────────────
export const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, type: 'access' }, config.jwtSecret, {
    expiresIn: config.accessTokenTtl,
  });

export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.type && payload.type !== 'access') {
    const err = new Error('Wrong token type');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return payload;
};

// ─────────────────────────────────────────────────────────────────────────────
// Refresh tokens (opaque random strings, stored hashed, rotated on every use)
// ─────────────────────────────────────────────────────────────────────────────
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const requestMeta = (req) => ({
  user_agent: (req?.headers?.['user-agent'] || '').slice(0, 255) || null,
  ip: req?.ip || req?.headers?.['x-forwarded-for'] || null,
});

// Mint a brand-new refresh token (used at login/register). Returns the raw
// token to send to the client; only its hash is stored.
export const issueRefreshToken = async (user, req) => {
  const raw = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    user_id: user.id,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + config.refreshTtlMs),
    ...requestMeta(req),
  });
  return raw;
};

// Rotate a refresh token: validate the presented one, revoke it, and issue a
// replacement. Detects reuse of an already-rotated token (possible theft) and
// revokes the entire token family for that user as a safety measure.
export const rotateRefreshToken = async (rawToken, req) => {
  if (!rawToken) return { ok: false, reason: 'missing' };

  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ where: { token_hash: tokenHash } });

  if (!existing) return { ok: false, reason: 'invalid' };

  // Reuse detection: a revoked token being presented again means it was either
  // already rotated (replay) or stolen. Revoke everything for that user.
  if (existing.revoked_at) {
    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { user_id: existing.user_id, revoked_at: null } },
    );
    return { ok: false, reason: 'reuse', userId: existing.user_id };
  }

  if (new Date(existing.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const newRaw = crypto.randomBytes(48).toString('hex');
  const newHash = hashToken(newRaw);
  await RefreshToken.create({
    user_id: existing.user_id,
    token_hash: newHash,
    expires_at: new Date(Date.now() + config.refreshTtlMs),
    ...requestMeta(req),
  });
  await existing.update({ revoked_at: new Date(), replaced_by: newHash });

  return { ok: true, raw: newRaw, userId: existing.user_id };
};

// Logout: revoke the single presented refresh token.
export const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { token_hash: hashToken(rawToken), revoked_at: null } },
  );
};

// Revoke every active session for a user (e.g. password change, account delete).
export const revokeAllForUser = async (userId) => {
  await RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null } },
  );
};

// Housekeeping: purge expired/revoked rows older than the retention window.
export const purgeStaleRefreshTokens = async () => {
  await RefreshToken.destroy({
    where: {
      [Op.or]: [
        { expires_at: { [Op.lt]: new Date() } },
        { revoked_at: { [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
};
