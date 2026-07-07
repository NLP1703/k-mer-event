import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';
import { Notification } from '../models/Notification.js';

dotenv.config();

// Create the `notifications` table if it does not exist yet. Idempotent:
// Sequelize's sync with alter/force disabled only issues CREATE TABLE IF NOT
// EXISTS, so re-running is a no-op on an existing table.
const up = async () => {
  await Notification.sync({ alter: false, force: false });
  console.log('✅ Ensured notifications table exists.');
};

const down = async () => {
  await Notification.drop();
  console.log('✅ Dropped notifications table.');
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
