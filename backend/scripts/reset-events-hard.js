import { sequelize } from '../config/db.js';
import '../models/index.js';

const run = async () => {
  const database = sequelize.getDatabaseName();

  // Disable FK checks to allow dropping/recreating even if metadata is inconsistent.
  await sequelize.query('SET FOREIGN_KEY_CHECKS=0');

  // Recreate tables in a safe order.
  // Drop the children first, then parent.
  const tablesInOrder = [
    'booking_items',
    'payments',
    'bookings',
    'events',
  ];

  for (const t of tablesInOrder) {
    await sequelize.query(`DROP TABLE IF EXISTS \`${t}\``);
  }

  // Re-enable FK checks.
  await sequelize.query('SET FOREIGN_KEY_CHECKS=1');

  // Re-sync only the models we need.
  const { Event } = await import('../models/Event.js');
  const { Booking } = await import('../models/Booking.js');
  const { BookingItem } = await import('../models/BookingItem.js');
  const { Payment } = await import('../models/Payment.js');

  // Create tables
  await Event.sync({ force: true });
  await Booking.sync({ force: true });
  await BookingItem.sync({ force: true });
  await Payment.sync({ force: true });

  console.log('✅ hard reset events/bookings/payments complete');
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ reset-events-hard failed:', err);
    process.exit(1);
  });

