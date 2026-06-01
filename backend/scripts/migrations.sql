-- =================================================================
-- K-MER Event — SQL migrations (idempotent)
-- Apply with:  mysql -u <user> -p <db> < scripts/migrations.sql
-- Or use the node scripts in package.json (preferred, fully idempotent).
-- =================================================================

-- 1) events.video_url  (Feature: video persistence)
-- Already shipped previously. Kept here for reference / fresh installs.
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND COLUMN_NAME = 'video_url'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE `events` ADD COLUMN `video_url` VARCHAR(1000) NULL;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) users.profile_picture (Feature 2)
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'profile_picture'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE `users` ADD COLUMN `profile_picture` VARCHAR(1000) NULL;',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =================================================================
-- Feature 3 (ticket auto-expiration) requires NO migration:
--   expiration is computed at read-time from events.start_date.
-- Feature 4 (organizer statistics) requires NO migration:
--   statistics are aggregated from existing tables.
-- =================================================================
