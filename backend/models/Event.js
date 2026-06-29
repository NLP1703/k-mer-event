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

  // Multiple photos — persisted as a JSON array string in a TEXT column.
  // Migration: backend/scripts/migrate-photo-urls.js (run `up` per environment).
  // Reads always return an array; writes accept an array, a JSON string, or a
  // comma-separated string.
  photo_urls: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('photo_urls');
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter(Boolean);
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    },
    set(val) {
      let arr = [];
      if (Array.isArray(val)) {
        arr = val.filter(Boolean);
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            arr = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } catch {
            arr = trimmed ? [trimmed] : [];
          }
        } else {
          arr = trimmed
            ? trimmed.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        }
      }
      this.setDataValue('photo_urls', JSON.stringify(arr));
    },
  },

  // Persistent video URL. Stored as VARCHAR(1000) NULL.
  // Migration: backend/scripts/migrate-video-url.js (also handled by init-db sync).
  video_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    defaultValue: null,
  },

  // Geolocation for the interactive map. Stored as DOUBLE NULL.
  // Migration: backend/scripts/migrate-geo.js (also auto-ensured by init-db sync).
  latitude: { type: DataTypes.DOUBLE, allowNull: true, defaultValue: null },
  longitude: { type: DataTypes.DOUBLE, allowNull: true, defaultValue: null },

  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE },
  // Money stored as DECIMAL(10,2) for exact arithmetic. The getter returns a JS
  // number (MySQL DECIMAL otherwise surfaces as a string).
  ticket_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('ticket_price');
      return v == null ? 0 : parseFloat(v);
    },
  },
  ticket_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  remaining_tickets: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'pending', 'published', 'cancelled'), defaultValue: 'published' },
  tags: { type: DataTypes.TEXT, defaultValue: '[]' },

  social_links: { type: DataTypes.TEXT, defaultValue: '{}' },

  // Referential ownership: FK to users.id (see scripts/migrate-organizer-id.js,
  // and init-db ensures the column). The legacy `organizer` string is retained
  // for display/back-compat but ownership checks prefer organizer_id.
  organizer_id: { type: DataTypes.UUID, allowNull: true },
});
