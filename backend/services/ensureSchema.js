import { sequelize } from '../config/db.js';
import { Notification } from '../models/Notification.js';

// ─────────────────────────────────────────────────────────────────────────────
// Best-effort runtime schema guard.
// ─────────────────────────────────────────────────────────────────────────────
// The production server runs `node server.js` (PM2) which does NOT run init-db.
// A few queries hard-depend on columns/tables added after the fact — most
// critically the PUBLIC events listing filters on `events.archived_at`, so a
// missing column would 500 the whole catalogue. To make any deploy method
// self-healing (PM2 update that forgot the migration, fresh Docker image…) we
// idempotently ensure the newest schema additions at boot. Each check is
// guarded so a failure (e.g. permissions, non-MySQL) never blocks startup.
//
// This mirrors the ensures already living in scripts/init-db.js; the dedicated
// migration scripts (migrate-archived / migrate-momo / migrate-notifications)
// remain the canonical path for operators who run them explicitly.

const columnExists = async (table, column) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const ensureColumn = async (table, column, ddl) => {
  try {
    if (await columnExists(table, column)) return;
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl};`);
    console.log(`✅ ensureSchema: added ${table}.${column}`);
  } catch (error) {
    console.warn(`⚠️  ensureSchema: could not ensure ${table}.${column}:`, error?.message || error);
  }
};

export const ensureSchema = async () => {
  // Only meaningful on MySQL (tests use SQLite and manage their own schema).
  if (sequelize.getDialect() !== 'mysql') return;

  // events.archived_at — auto-archival of past events (public listing depends on it).
  await ensureColumn('events', 'archived_at', '`archived_at` DATETIME NULL');

  // Per-operator Mobile Money numbers.
  await ensureColumn('users', 'momo_mtn', '`momo_mtn` VARCHAR(30) NULL');
  await ensureColumn('users', 'momo_orange', '`momo_orange` VARCHAR(30) NULL');

  // notifications table (in-app notifications).
  try {
    await Notification.sync({ alter: false, force: false });
  } catch (error) {
    console.warn('⚠️  ensureSchema: could not ensure notifications table:', error?.message || error);
  }
};
