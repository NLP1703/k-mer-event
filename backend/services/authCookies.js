import { config } from '../config/env.js';

// Centralised refresh-token cookie handling so the Set-Cookie / Clear-Cookie
// attributes always match (a common source of "logout doesn't work" bugs).
const baseOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  domain: config.cookie.domain,
  path: '/api/auth',
});

export const setRefreshCookie = (res, rawToken) => {
  res.cookie(config.cookie.name, rawToken, {
    ...baseOptions(),
    maxAge: config.refreshTtlMs,
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(config.cookie.name, baseOptions());
};

export const readRefreshCookie = (req) => req.cookies?.[config.cookie.name] || null;
