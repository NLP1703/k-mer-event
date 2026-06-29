// Replace name-based ownership (events.organizer == user.name) with a real
// referential link events.organizer_id -> users.id.
//
// Steps (all idempotent):
//   1. add events.organizer_id CHAR(36) NULL if missing
//   2. backfill it from the legacy `organizer` name where it maps to an
//      organizer/admin account
//   3. add an index on organizer_id
//   4. add a FK organizer_id -> users(id) ON DELETE SET NULL
//
// Only MySQL is targeted (production dialect).
import { sequelize } from '../config/db.js';

const TABLE = 'events';

const columnExists = async (table, column) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const indexExists = async (table, indexName) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [table, indexName] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const constraintExists = async (table, name) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    { replacements: [table, name] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const up = async () => {
  if (!(await columnExists(TABLE, 'organizer_id'))) {
    await sequelize.query('ALTER TABLE `events` ADD COLUMN `organizer_id` CHAR(36) NULL;');
    console.log('✅ Added events.organizer_id');
  } else {
    console.log('ℹ️  events.organizer_id already exists');
  }

  // Backfill from the legacy organizer name.
  const [result] = await sequelize.query(
    `UPDATE events e
       JOIN users u ON u.name = e.organizer AND u.role IN ('organizer', 'admin')
        SET e.organizer_id = u.id
      WHERE e.organizer_id IS NULL;`,
  );
  console.log('✅ Backfilled organizer_id from organizer name');

  if (!(await indexExists(TABLE, 'events_organizer_id'))) {
    await sequelize.query('CREATE INDEX `events_organizer_id` ON `events` (`organizer_id`);');
    console.log('✅ Created index events_organizer_id');
  }

  if (!(await constraintExists(TABLE, 'fk_events_organizer_id'))) {
    await sequelize.query(
      'ALTER TABLE `events` ADD CONSTRAINT `fk_events_organizer_id` ' +
        'FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;',
    );
    console.log('✅ Added FK fk_events_organizer_id -> users(id)');
  } else {
    console.log('ℹ️  FK fk_events_organizer_id already exists');
  }
};

const down = async () => {
  if (await constraintExists(TABLE, 'fk_events_organizer_id')) {
    await sequelize.query('ALTER TABLE `events` DROP FOREIGN KEY `fk_events_organizer_id`;');
  }
  if (await indexExists(TABLE, 'events_organizer_id')) {
    await sequelize.query('DROP INDEX `events_organizer_id` ON `events`;');
  }
  console.log('✅ Reverted organizer_id FK/index (column kept).');
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
