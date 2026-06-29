import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { User } from '../models/User.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/tokenService.js';
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from '../services/authCookies.js';
import { checkLockout, recordAttempt } from '../services/loginGuard.js';
import { config } from '../config/env.js';

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  telephone: user.telephone ?? null,
  organization_name: user.organization_name ?? null,
  profile_picture: user.profile_picture ?? null,
  avatar_url: user.avatar_url ?? null,
});

// Issue an access token + refresh cookie and return the standard auth payload.
const establishSession = async (res, req, user) => {
  const accessToken = signAccessToken(user);
  const refreshRaw = await issueRefreshToken(user, req);
  setRefreshCookie(res, refreshRaw);
  // `token` kept for backward compatibility with existing clients.
  return { user: publicUser(user), accessToken, token: accessToken };
};

export const registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { name, telephone, email, password, role = 'user', organization_name } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      telephone,
      email,
      password: hashedPassword,
      role,
      organization_name: role === 'organizer' ? organization_name : null,
    });

    const payload = await establishSession(res, req, user);
    return res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const ip = req.ip;

    // 1) Progressive brute-force lockout (per email AND per IP).
    const lock = await checkLockout({ email, ip });
    if (lock.locked) {
      res.set('Retry-After', String(lock.retryAfterSec));
      return res.status(429).json({
        message: 'Too many failed attempts. Please try again later.',
        retryAfter: lock.retryAfterSec,
      });
    }

    const user = await User.findOne({ where: { email } });

    // Use a constant-ish path so timing doesn't trivially reveal account existence.
    const valid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !valid) {
      await recordAttempt({ email, ip, success: false, userId: user?.id });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2) Refuse login for soft-deleted accounts, BEFORE issuing any token.
    if (user.is_deleted) {
      await recordAttempt({ email, ip, success: false, userId: user.id });
      return res.status(403).json({ message: 'This account has been deactivated.' });
    }

    await recordAttempt({ email, ip, success: true, userId: user.id });
    const payload = await establishSession(res, req, user);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
};

// Exchange a valid refresh cookie for a fresh access token (and rotate the
// refresh token). The old refresh token is revoked on every call.
export const refreshSession = async (req, res, next) => {
  try {
    const raw = readRefreshCookie(req);
    const result = await rotateRefreshToken(raw, req);

    if (!result.ok) {
      clearRefreshCookie(res);
      const status = result.reason === 'reuse' ? 401 : 401;
      return res.status(status).json({ message: 'Session expired, please log in again.' });
    }

    const user = await User.findByPk(result.userId);
    if (!user || user.is_deleted) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Session is no longer valid.' });
    }

    setRefreshCookie(res, result.raw);
    const accessToken = signAccessToken(user);
    return res.json({ user: publicUser(user), accessToken, token: accessToken });
  } catch (error) {
    next(error);
  }
};

// Real logout: revoke the server-side refresh token and clear the cookie.
export const logoutUser = async (req, res, next) => {
  try {
    const raw = readRefreshCookie(req);
    await revokeRefreshToken(raw);
    clearRefreshCookie(res);
    return res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

export const currentUser = async (req, res) => {
  return res.json({ user: publicUser(req.user) });
};

export { config };
