import { sequelize } from '../config/db.js';

// This script attempts to repair the broken FK carts.event_id -> events.id
// by dropping any existing FK on carts(event_id) and re-adding it.
// It is intentionally defensive: it checks FK existence first.

const main = async () => {
  const query = async (sql, replacements) => {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows;
  };

  const fks = await query(
    `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'carts'
       AND REFERENCED_TABLE_NAME = 'events'
       AND COLUMN_NAME = 'event_id'`
  );

  console.log('Found carts->events FKs:', fks);

  if (!fks.length) {
    console.log('No FK carts.event_id -> events.id found. Exiting.');
    return;
  }

  // Drop all matching constraints
  for (const fk of fks) {
    console.log('Dropping FK:', fk.CONSTRAINT_NAME);
    await sequelize.query(`ALTER TABLE carts DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
  }

  // Re-add with matching types using Sequelize-compatible UUID columns.
  // If the referenced events.id/column types are inconsistent, this will still fail,
  // but the FK error you saw indicates a mismatch.
  await sequelize.query(
    `ALTER TABLE carts
     ADD CONSTRAINT fk_carts_event_id
     FOREIGN KEY (event_id) REFERENCES events(id)
     ON DELETE NO ACTION ON UPDATE CASCADE`
  );

  console.log('✅ carts FK repaired');
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ fix-carts-fk failed:', err);
    process.exit(1);
  });

