import { sequelize } from '../config/db.js';
import '../models/index.js';

const resetEventsFull = async () => {
  const { Event } = await import('../models/Event.js');
  const { Booking } = await import('../models/Booking.js');
  const { Payment } = await import('../models/Payment.js');
  const { BookingItem } = await import('../models/BookingItem.js');

  // Reset order: children first (payments/booking_items) -> bookings -> events
  console.log('⚠️ Dropping payments, booking_items, bookings, then events ...');

  // Drop booking_items first (if FK exists)
  await sequelize.getQueryInterface().dropTable(BookingItem.getTableName(), { force: true });

  // Drop payments (depends on bookings)
  await sequelize.getQueryInterface().dropTable(Payment.getTableName(), { force: true });

  // Drop bookings (depends on events)
  await sequelize.getQueryInterface().dropTable(Booking.getTableName(), { force: true });

  // Finally drop events
  await sequelize.getQueryInterface().dropTable(Event.getTableName(), { force: true });

  console.log('✅ Recreating events/bookings/payments tables ...');

  await Event.sync({ force: true });

  // Booking/Payment aren't needed for event listing, but we recreate them to keep the app consistent.
  await Booking.sync({ force: true });
  await Payment.sync({ force: true });
  await BookingItem.sync({ force: true });

  console.log('✅ Reset full complete');
};

resetEventsFull()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ reset-events-full failed:', err);
    process.exit(1);
  });

