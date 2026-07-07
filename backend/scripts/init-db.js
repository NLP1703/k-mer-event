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

    // Ensure schema additions Sequelize won't perform itself (we run with alter:false).
    // Add events.video_url if missing — required for video persistence.
    try {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'events'
           AND COLUMN_NAME = 'video_url'`
      );
      const hasColumn = Number(rows?.[0]?.cnt || 0) > 0;
      if (!hasColumn) {
        await sequelize.query(
          "ALTER TABLE `events` ADD COLUMN `video_url` VARCHAR(1000) NULL;"
        );
        console.log('✅ Added missing column events.video_url');
      }
    } catch (e) {
      console.warn('⚠️  Could not ensure events.video_url column:', e?.message || e);
    }

    // Ensure users.profile_picture column exists (persistent VARCHAR(1000)).
    try {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = 'profile_picture'`
      );
      const hasColumn = Number(rows?.[0]?.cnt || 0) > 0;
      if (!hasColumn) {
        await sequelize.query(
          "ALTER TABLE `users` ADD COLUMN `profile_picture` VARCHAR(1000) NULL;"
        );
        console.log('✅ Added missing column users.profile_picture');
      }
    } catch (e) {
      console.warn('⚠️  Could not ensure users.profile_picture column:', e?.message || e);
    }

    // Ensure events.latitude / events.longitude exist (interactive map).
    for (const column of ['latitude', 'longitude']) {
      try {
        const [rows] = await sequelize.query(
          `SELECT COUNT(*) AS cnt
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'events'
             AND COLUMN_NAME = ?`,
          { replacements: [column] },
        );
        const hasColumn = Number(rows?.[0]?.cnt || 0) > 0;
        if (!hasColumn) {
          await sequelize.query(`ALTER TABLE \`events\` ADD COLUMN \`${column}\` DOUBLE NULL;`);
          console.log(`✅ Added missing column events.${column}`);
        }
      } catch (e) {
        console.warn(`⚠️  Could not ensure events.${column} column:`, e?.message || e);
      }
    }

    // First attempt the regular sync.
    await sequelize.sync({ alter: false, force: false, logging: false });

    // Ensure the `waitlists` table exists (waitlist feature).
    try {
      const { Waitlist } = await import('../models/Waitlist.js');
      await Waitlist.sync({ alter: false, force: false });
      console.log('✅ Ensured Waitlist table exists');
    } catch (e) {
      console.warn('⚠️ Could not ensure Waitlist table exists:', e?.message || e);
    }

    // If carts is missing, the initial sync may have been skipped/aborted.
    // Ensure the `carts` table exists by syncing only the Cart model.
    try {
      const { Cart } = await import('../models/Cart.js');
      await Cart.sync({ alter: false, force: false });
      console.log('✅ Ensured Cart table exists');
    } catch (e) {
      console.warn('⚠️ Could not ensure Cart table exists:', e?.message || e);
    }

    // Ensure the `activity_log` table exists (weekly-usage analytics).
    try {
      const { ActivityLog } = await import('../models/ActivityLog.js');
      await ActivityLog.sync({ alter: false, force: false });
      console.log('✅ Ensured ActivityLog table exists');
    } catch (e) {
      console.warn('⚠️ Could not ensure ActivityLog table exists:', e?.message || e);
    }

    // Ensure the authentication-hardening tables exist (refresh tokens, login
    // attempts) and the server-side favourites table.
    try {
      const { RefreshToken } = await import('../models/RefreshToken.js');
      const { LoginAttempt } = await import('../models/LoginAttempt.js');
      const { Favorite } = await import('../models/Favorite.js');
      await RefreshToken.sync({ alter: false, force: false });
      await LoginAttempt.sync({ alter: false, force: false });
      await Favorite.sync({ alter: false, force: false });
      console.log('✅ Ensured refresh_tokens, login_attempts, favorites tables exist');
    } catch (e) {
      console.warn('⚠️ Could not ensure auth/favorites tables exist:', e?.message || e);
    }

    // Ensure the `notifications` table exists (in-app notifications).
    try {
      const { Notification } = await import('../models/Notification.js');
      await Notification.sync({ alter: false, force: false });
      console.log('✅ Ensured Notification table exists');
    } catch (e) {
      console.warn('⚠️ Could not ensure Notification table exists:', e?.message || e);
    }

    // Ensure bookings.payment_proof_url column exists (Mobile Money proof
    // screenshot uploaded by the buyer, reviewed by the organizer).
    try {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'payment_proof_url'`,
      );
      if (Number(rows?.[0]?.cnt || 0) === 0) {
        await sequelize.query('ALTER TABLE `bookings` ADD COLUMN `payment_proof_url` VARCHAR(1000) NULL;');
        console.log('✅ Added missing column bookings.payment_proof_url');
      }
    } catch (e) {
      console.warn('⚠️  Could not ensure bookings.payment_proof_url column:', e?.message || e);
    }

    // Ensure events.organizer_id column exists (referential ownership). The FK
    // and backfill are applied by scripts/migrate-organizer-id.js.
    try {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'organizer_id'`,
      );
      if (Number(rows?.[0]?.cnt || 0) === 0) {
        await sequelize.query('ALTER TABLE `events` ADD COLUMN `organizer_id` CHAR(36) NULL;');
        console.log('✅ Added missing column events.organizer_id');
      }
    } catch (e) {
      console.warn('⚠️  Could not ensure events.organizer_id column:', e?.message || e);
    }

    // Ensure events.archived_at column exists (auto-archival of past events).
    try {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'archived_at'`,
      );
      if (Number(rows?.[0]?.cnt || 0) === 0) {
        await sequelize.query('ALTER TABLE `events` ADD COLUMN `archived_at` DATETIME NULL;');
        console.log('✅ Added missing column events.archived_at');
      }
    } catch (e) {
      console.warn('⚠️  Could not ensure events.archived_at column:', e?.message || e);
    }

    // Ensure users.momo_mtn / users.momo_orange columns exist (per-operator
    // Mobile Money numbers so buyers can pay the organizer on the right network).
    for (const column of ['momo_mtn', 'momo_orange']) {
      try {
        const [rows] = await sequelize.query(
          `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
          { replacements: [column] },
        );
        if (Number(rows?.[0]?.cnt || 0) === 0) {
          await sequelize.query(`ALTER TABLE \`users\` ADD COLUMN \`${column}\` VARCHAR(30) NULL;`);
          console.log(`✅ Added missing column users.${column}`);
        }
      } catch (e) {
        console.warn(`⚠️  Could not ensure users.${column} column:`, e?.message || e);
      }
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

