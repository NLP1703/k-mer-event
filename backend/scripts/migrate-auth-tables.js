// Idempotent migration for the authentication-hardening tables:
//   • refresh_tokens  — rotating, revocable refresh-token store
//   • login_attempts  — brute-force audit / progressive lockout
// Model.sync() issues CREATE TABLE IF NOT EXISTS, so re-running is safe.
import { sequelize } from '../config/db.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { LoginAttempt } from '../models/LoginAttempt.js';

const up = async () => {
  await RefreshToken.sync();
  await LoginAttempt.sync();
  console.log('✅ Ensured refresh_tokens and login_attempts tables exist.');
};

const down = async () => {
  await RefreshToken.drop();
  await LoginAttempt.drop();
  console.log('✅ Dropped refresh_tokens and login_attempts tables.');
};

const run = async () => {
  const direction = (process.argv[2] || 'up').toLowerCase();
  try {
    await sequelize.authenticate();
    if (direction === 'down') await down();
    else await up();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error?.message || error);
    process.exit(1);
  }
};

run();
