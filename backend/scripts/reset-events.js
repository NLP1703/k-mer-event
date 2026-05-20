import { sequelize } from '../config/db.js';
import '../models/index.js';

const resetEvents = async () => {
  // Drop & recreate only the events table to repair schema incompatibilities
  // (not touching bookings/payments to avoid cascading issues).
  const { Event } = await import('../models/Event.js');

  // Ensure model is registered
  // sequelize.models.Event should exist

  console.log('⚠️ Dropping events table (DROP) ...');
  await sequelize.getQueryInterface().dropTable(Event.getTableName(), { force: true });

  console.log('✅ Recreating events table (CREATE) ...');
  await Event.sync({ force: true });

  console.log('✅ events table reset complete');
};

resetEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ reset-events failed:', err);
    process.exit(1);
  });

