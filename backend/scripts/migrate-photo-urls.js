import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';

dotenv.config();

const TABLE = 'events';
const COLUMN = 'photo_urls';

const columnExists = async () => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [TABLE, COLUMN] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const up = async () => {
  if (await columnExists()) {
    console.log(`ℹ️  Column ${TABLE}.${COLUMN} already exists — nothing to do.`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` TEXT NULL;`);
  console.log(`✅ Added column ${TABLE}.${COLUMN} (TEXT NULL).`);
};

const down = async () => {
  if (!(await columnExists())) {
    console.log(`ℹ️  Column ${TABLE}.${COLUMN} does not exist — nothing to drop.`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${TABLE}\` DROP COLUMN \`${COLUMN}\`;`);
  console.log(`✅ Dropped column ${TABLE}.${COLUMN}.`);
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
