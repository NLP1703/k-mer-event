import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';

dotenv.config();

const TABLE = 'survey_responses';

const tableExists = async () => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    { replacements: [TABLE] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const up = async () => {
  if (await tableExists()) {
    console.log(`ℹ️  Table ${TABLE} already exists — nothing to do.`);
    return;
  }
  await sequelize.query(`
    CREATE TABLE \`${TABLE}\` (
      \`id\` CHAR(36) NOT NULL,
      \`answers\` JSON NOT NULL,
      \`ip\` VARCHAR(255) NULL,
      \`user_agent\` VARCHAR(512) NULL,
      \`created_at\` DATETIME NOT NULL,
      \`updated_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`survey_responses_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log(`✅ Created table ${TABLE}.`);
};

const down = async () => {
  if (!(await tableExists())) {
    console.log(`ℹ️  Table ${TABLE} does not exist — nothing to drop.`);
    return;
  }
  await sequelize.query(`DROP TABLE \`${TABLE}\`;`);
  console.log(`✅ Dropped table ${TABLE}.`);
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
