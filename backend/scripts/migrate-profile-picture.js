import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';

dotenv.config();

const TABLE = 'users';
const COLUMN = 'profile_picture';

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
  const exists = await columnExists();
  if (exists) {
    console.log(`ℹ️ Column ${TABLE}.${COLUMN} already exists.`);
    return;
  }
  await sequelize.query(
    `ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` VARCHAR(1000) NULL;`,
  );
  console.log(`✅ Added column ${TABLE}.${COLUMN}.`);
};

const down = async () => {
  const exists = await columnExists();
  if (!exists) {
    console.log(`ℹ️ Column ${TABLE}.${COLUMN} does not exist.`);
    return;
  }
  await sequelize.query(
    `ALTER TABLE \`${TABLE}\` DROP COLUMN \`${COLUMN}\`;`,
  );
  console.log(`✅ Dropped column ${TABLE}.${COLUMN}.`);
};

const direction = (process.argv[2] || 'up').toLowerCase();

(async () => {
  try {
    if (direction === 'down') {
      await down();
    } else {
      await up();
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error?.message || error);
    process.exit(1);
  }
})();
