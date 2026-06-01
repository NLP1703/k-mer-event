import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const Event = sequelize.define('Event', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  venue: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  organizer: { type: DataTypes.STRING, allowNull: false },
  banner_url: { type: DataTypes.STRING },

  // Multiple photos.
  // Some environments/DB migrations may not have `events.photo_urls` yet.
  // Make it VIRTUAL so Sequelize won't SELECT it (prevents:
  // "Unknown column 'event.photo_urls' in 'field list'").
  photo_urls: {
    type: DataTypes.VIRTUAL(DataTypes.TEXT),
    get() {
      return [];
    },
    set(_val) {
      // no-op: DB column may be missing
    },
  },

  // Persistent video URL. Stored as VARCHAR(1000) NULL.
  // Migration: backend/scripts/migrate-video-url.js (also handled by init-db sync).
  video_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    defaultValue: null,
  },

  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE },
  ticket_price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  ticket_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  remaining_tickets: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'pending', 'published', 'cancelled'), defaultValue: 'published' },
  tags: { type: DataTypes.TEXT, defaultValue: '[]' },

  social_links: { type: DataTypes.TEXT, defaultValue: '{}' },

  // organizer_id column may not exist in the current MySQL schema.
  // Make it virtual so Sequelize won't SELECT/WHERE it when it's missing.
  organizer_id: {
    type: DataTypes.VIRTUAL(DataTypes.UUID),
    get() {
      return null;
    },
    set(_val) {
      // no-op (column may be missing)
    },
  },
});
