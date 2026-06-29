import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Centralised, validated environment configuration.
// ─────────────────────────────────────────────────────────────────────────────
// One source of truth for every runtime setting. Secrets have NO hard-coded
// fallback: the server refuses to boot without a real JWT_SECRET (see
// validateEnv(), called from server.js before anything else starts).

const trimmed = (key) => {
  const v = process.env[key];
  return v == null ? '' : String(v).trim();
};

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

// Known weak/placeholder secrets that historically shipped with the project.
// Any of these must be rejected so a real, random secret is always used.
const WEAK_SECRETS = new Set([
  'kmersecret',
  'supersecretjwtkey',
  'change_me_kmersecret',
  'changeme',
  'secret',
  'password',
]);

const jwtSecret = trimmed('JWT_SECRET');

// Refresh tokens are signed with a SEPARATE key so that leaking/forging an
// access token can never be replayed as a refresh token. If no dedicated
// JWT_REFRESH_SECRET is provided we derive a distinct-but-deterministic key
// from JWT_SECRET (HMAC) — this keeps single-secret deployments working while
// still using two independent keys under the hood.
const jwtRefreshSecret =
  trimmed('JWT_REFRESH_SECRET') ||
  (jwtSecret
    ? crypto.createHmac('sha256', jwtSecret).update('kmer:refresh').digest('hex')
    : '');

// Refresh-token lifetime in days (also used to set the cookie Max-Age).
const refreshTtlDays = Number(process.env.JWT_REFRESH_TTL_DAYS) || 7;

export const config = {
  nodeEnv: NODE_ENV,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 4000,

  // Auth
  jwtSecret,
  jwtRefreshSecret,
  accessTokenTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTtlDays,
  refreshTtlMs: refreshTtlDays * 24 * 60 * 60 * 1000,
  // Cookie attributes. Secure + SameSite=None are required for cross-site
  // cookies over HTTPS (prod behind Nginx); in dev over http we relax to Lax.
  cookie: {
    name: 'kmer_rt',
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  },

  // Database
  db: {
    name: process.env.DB_NAME || 'kmer_event',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  },

  // CORS allowlist
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

// Fail fast on misconfiguration. Called once at server startup (NOT at import
// time) so that one-off DB/migration scripts can run without auth secrets.
export const validateEnv = () => {
  const errors = [];
  const warnings = [];

  if (!jwtSecret) {
    errors.push(
      'JWT_SECRET is required and has no fallback. Generate one with: npm run generate:secret',
    );
  } else if (WEAK_SECRETS.has(jwtSecret.toLowerCase())) {
    errors.push(
      'JWT_SECRET is a known weak placeholder. Replace it with: npm run generate:secret',
    );
  } else if (jwtSecret.length < 32) {
    warnings.push('JWT_SECRET is shorter than 32 characters — prefer a 64-hex-char random value.');
  }

  if (isProd && !config.db.password) {
    warnings.push('DB_PASSWORD is empty in production.');
  }

  if (warnings.length) {
    console.warn('\n⚠️  Environment warnings:\n' + warnings.map((w) => '   - ' + w).join('\n') + '\n');
  }
  if (errors.length) {
    console.error(
      '\n❌ Refusing to start — invalid environment configuration:\n' +
        errors.map((e) => '   - ' + e).join('\n') +
        '\n',
    );
    process.exit(1);
  }
};
