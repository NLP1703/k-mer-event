import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';

dotenv.config();

const TABLE = 'events';
const COLUMNS = ['latitude', 'longitude'];

const columnExists = async (column) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [TABLE, column] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const up = async () => {
  for (const column of COLUMNS) {
    if (await columnExists(column)) {
      console.log(`ℹ️  Column ${TABLE}.${column} already exists — skipped.`);
      continue;
    }
    await sequelize.query(`ALTER TABLE \`${TABLE}\` ADD COLUMN \`${column}\` DOUBLE NULL;`);
    console.log(`✅ Added column ${TABLE}.${column} (DOUBLE NULL).`);
  }
};

const down = async () => {
  for (const column of COLUMNS) {
    if (!(await columnExists(column))) {
      console.log(`ℹ️  Column ${TABLE}.${column} does not exist — skipped.`);
      continue;
    }
    await sequelize.query(`ALTER TABLE \`${TABLE}\` DROP COLUMN \`${column}\`;`);
    console.log(`✅ Dropped column ${TABLE}.${column}.`);
  }
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
