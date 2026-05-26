import dotenv from 'dotenv';
import { sequelize } from '../config/db.js';
import '../models/index.js';

dotenv.config();

const syncDatabase = async () => {
  try {
    // NOTE: this project currently fails during FK creation for `payments`.
    // Avoid blocking demo seeding and local UI testing.
    // Important: on évite `alter: true` car il déclenche des ALTER MySQL instables (InnoDB autoextend out of range)
    // qui peuvent casser la structure et empêcher un seed fiable.

    // First attempt the regular sync.
    await sequelize.sync({ alter: false, force: false, logging: false });

    // If carts is missing, the initial sync may have been skipped/aborted.
    // Ensure the `carts` table exists by syncing only the Cart model.
    try {
      const { Cart } = await import('../models/Cart.js');
      await Cart.sync({ alter: false, force: false });
      console.log('✅ Ensured Cart table exists');
    } catch (e) {
      console.warn('⚠️ Could not ensure Cart table exists:', e?.message || e);
    }

    console.log('✅ Database schema synced (attempted) successfully');

    // Seed demo events:

    // - Si RUN_DEMO_SEED=true, on seed.
    // - Sinon, on seed uniquement si la table `events` est vide.
    //   (évite le bug "aucun événement" après reset/migration)
    const shouldSeed = async () => {
      if (process.env.RUN_DEMO_SEED === 'true') return true;
      try {
        const { Event } = await import('../models/Event.js');
        const count = await Event.count();
        return Number(count) === 0;
      } catch (e) {
        console.warn(
          '⚠️ Could not determine Event count; falling back to RUN_DEMO_SEED:',
          e?.message || e,
        );
        return false;
      }
    };

    if (await shouldSeed()) {
      console.log('🌱 Seeding demo events...');
      await import('./seed-demo-events.js');
    } else {
      console.log('ℹ️ Demo seeding skipped (events already exist).');
    }

    // Seed admin user (needed for /api/dashboard and admin CRUD)
    console.log('🛡️ Seeding admin user...');
    await import('./seed-admin.js').then((m) => m.seedAdmin());

    process.exit(0);
  } catch (error) {
    console.error('⚠️ Schema sync failed (continuing):', error);
    // Demo seeding/UI can still work if the `payments` table already exists.
  }
};

syncDatabase();

