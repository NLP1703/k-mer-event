import { Op } from 'sequelize';
import { LoginAttempt } from '../models/LoginAttempt.js';

// ─────────────────────────────────────────────────────────────────────────────
// Progressive brute-force lockout.
// ─────────────────────────────────────────────────────────────────────────────
// We count *failed* attempts in a rolling window, independently per email and
// per IP, and translate the count into an escalating lockout. Every attempt
// (success or failure) is journaled in `login_attempts` for audit.

const WINDOW_MS = 15 * 60 * 1000; // look back 15 minutes

// failureCount -> lockout duration (ms). Thresholds are progressive.
const tierFor = (failures) => {
  if (failures >= 20) return 60 * 60 * 1000; // 1 hour
  if (failures >= 12) return 15 * 60 * 1000; // 15 min
  if (failures >= 8) return 5 * 60 * 1000; // 5 min
  if (failures >= 5) return 60 * 1000; // 1 min
  return 0;
};

const countRecentFailures = async (where) => {
  try {
    return await LoginAttempt.count({
      where: {
        ...where,
        success: false,
        created_at: { [Op.gte]: new Date(Date.now() - WINDOW_MS) },
      },
    });
  } catch {
    // If the table is unavailable, fail open rather than lock everyone out.
    return 0;
  }
};

// Returns { locked: boolean, retryAfterSec: number } given the current failure
// state for the email and the IP. The stricter of the two applies.
export const checkLockout = async ({ email, ip }) => {
  const [byEmail, byIp] = await Promise.all([
    email ? countRecentFailures({ email }) : 0,
    ip ? countRecentFailures({ ip }) : 0,
  ]);
  const lock = Math.max(tierFor(byEmail), tierFor(byIp));
  if (lock <= 0) return { locked: false, retryAfterSec: 0 };
  return { locked: true, retryAfterSec: Math.ceil(lock / 1000), failures: Math.max(byEmail, byIp) };
};

export const recordAttempt = async ({ email, ip, success, userId }) => {
  try {
    await LoginAttempt.create({ email: email || null, ip: ip || null, success: !!success, user_id: userId || null });
  } catch {
    // best-effort journaling; never block auth on logging failure
  }
  if (!success) {
    // Structured log line for external SIEM/monitoring ingestion.
    console.warn('[auth] failed login', JSON.stringify({ email, ip, at: new Date().toISOString() }));
  }
};
