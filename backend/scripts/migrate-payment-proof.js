// Add bookings.payment_proof_url — the buyer-uploaded Mobile Money proof
// (screenshot URL) that the organizer reviews before confirming a booking.
// Idempotent: only adds the column when it is missing.
import { sequelize } from '../config/db.js';

const columnExists = async (table, column) => {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] },
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
};

const up = async () => {
  if (await columnExists('bookings', 'payment_proof_url')) {
    console.log('ℹ️  bookings.payment_proof_url already exists');
    return;
  }
  await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `payment_proof_url` VARCHAR(1000) NULL;');
  console.log('✅ Added bookings.payment_proof_url');
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
