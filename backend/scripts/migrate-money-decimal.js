// Convert monetary columns from FLOAT to DECIMAL(10,2) for exact money storage.
//   events.ticket_price, bookings.total_price, payments.amount
// Idempotent: only alters a column whose DATA_TYPE is not already 'decimal'.
import { sequelize } from '../config/db.js';

const targets = [
  { table: 'events', column: 'ticket_price' },
  { table: 'bookings', column: 'total_price' },
  { table: 'payments', column: 'amount' },
];

const dataType = async (table, column) => {
  const [rows] = await sequelize.query(
    `SELECT DATA_TYPE AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] },
  );
  return rows?.[0]?.t || null;
};

const up = async () => {
  for (const { table, column } of targets) {
    const type = await dataType(table, column);
    if (type == null) {
      console.log(`ℹ️  ${table}.${column} not found — skipped`);
      continue;
    }
    if (String(type).toLowerCase() === 'decimal') {
      console.log(`ℹ️  ${table}.${column} already DECIMAL`);
      continue;
    }
    await sequelize.query(
      `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` DECIMAL(10,2) NOT NULL DEFAULT 0;`,
    );
    console.log(`✅ ${table}.${column} -> DECIMAL(10,2)`);
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
