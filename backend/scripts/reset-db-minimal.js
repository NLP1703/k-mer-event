import { sequelize } from '../config/db.js';

import '../models/index.js';

const main = async () => {
  // Minimal hard reset: drop only existing tables, then recreate via sync.
  // This avoids hitting FK-creation problems from half-broken schemas.
  await sequelize.query('SET FOREIGN_KEY_CHECKS=0');

  const [tables] = await sequelize.query('SHOW TABLES');
  const tableRows = Array.isArray(tables) ? tables : [];

  for (const t of tableRows) {
    const tableName = t.Tables_in_kmer_event || t[Object.keys(t)[0]];
    if (!tableName) continue;
    console.log('Dropping', tableName);
    await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS=1');

  // Recreate schema
  await sequelize.sync({ alter: true, force: false });
  console.log('✅ DB schema recreated (sequelize.sync alter)');
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ reset-db-minimal failed:', err);
    process.exit(1);
  });

