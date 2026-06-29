// Add indexes that back the event search/filter/sort queries so listing scales
// past the previous hard 40-row cap. Idempotent (checks information_schema).
import { sequelize } from '../config/db.js';

const indexes = [
  { name: 'events_status', cols: '(`status`)' },
  { name: 'events_city', cols: '(`city`)' },
  { name: 'events_category', cols: '(`category`)' },
  { name: 'events_start_date', cols: '(`start_date`)' },
  { name: 'events_status_start', cols: '(`status`, `start_date`)' },
  // FULLTEXT lets us move from LIKE '%x%' scans toward MATCH() ranking and
  // keeps a clean path to an external engine (Elasticsearch) later.
  { name: 'events_ft_search', cols: '(`title`, `description`, `venue`, `city`)', fulltext: true },
];

const indexExists = async (name) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND INDEX_NAME = ?`,
    { replacements: [name] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const up = async () => {
  for (const idx of indexes) {
    if (await indexExists(idx.name)) {
      console.log(`ℹ️  index ${idx.name} already exists`);
      continue;
    }
    try {
      const type = idx.fulltext ? 'FULLTEXT INDEX' : 'INDEX';
      await sequelize.query(`CREATE ${type} \`${idx.name}\` ON \`events\` ${idx.cols};`);
      console.log(`✅ created ${idx.name}`);
    } catch (e) {
      console.warn(`⚠️  could not create ${idx.name}:`, e?.message || e);
    }
  }
};

const run = async () => {
  try {
    await sequelize.authenticate();
    await up();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error?.message || error);
    process.exit(1);
  }
};

run();
