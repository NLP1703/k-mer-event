// Idempotent migration for the server-side favourites table.
import { sequelize } from '../config/db.js';
import { Favorite } from '../models/Favorite.js';

const up = async () => {
  await Favorite.sync();
  console.log('✅ Ensured favorites table exists.');
};

const down = async () => {
  await Favorite.drop();
  console.log('✅ Dropped favorites table.');
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
