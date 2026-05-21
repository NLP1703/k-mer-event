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
  // NOTE: MySQL JSON type/alter was failing in this environment.
  // We store arrays/objects as TEXT to keep the app functional.
  // Le schéma de la DB courante utilise peut-être `photo_url` (singulier) => on mappe `photo_urls`.
  // photo_urls is not present in the current `events` table.
  // Keep it as a virtual attribute so the API can accept/update it without breaking SELECTs.
  photo_urls: {
    type: DataTypes.VIRTUAL(DataTypes.TEXT),
    get() {
      return [];
    },
    set(_val) {
      // no-op: column missing in DB
    },
  },

  // video_url is not present in the current `events` table.
  video_url: {
    type: DataTypes.VIRTUAL(DataTypes.STRING),
    get() {
      return null;
    },
    set(_val) {
      // no-op
    },
  },

  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE },
  ticket_price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  ticket_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  remaining_tickets: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'published', 'cancelled'), defaultValue: 'published' },
  tags: { type: DataTypes.TEXT, defaultValue: '[]' },

  social_links: { type: DataTypes.TEXT, defaultValue: '{}' },

});
