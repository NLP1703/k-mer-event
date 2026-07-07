import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export const User = sequelize.define(
  'User',
  {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

  name: { type: DataTypes.STRING, allowNull: false },
  telephone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('user', 'admin', 'organizer'), allowNull: false, defaultValue: 'user' },
  // organization_name may not exist in the current MySQL schema.
  // Make it virtual so SELECT won't fail if the column is missing.
  organization_name: {
    type: DataTypes.VIRTUAL(DataTypes.STRING),
    get() {
      return null;
    },
    set(_val) {
      // no-op (column may be missing)
    },
  },

  avatar_url: { type: DataTypes.STRING },

  // Per-operator Mobile Money numbers. When an organizer sells tickets, buyers
  // pay them directly on the matching network: MTN MoMo -> momo_mtn, Orange
  // Money -> momo_orange. Both optional; `telephone` is the legacy fallback.
  // Migration: backend/scripts/migrate-momo.js (also auto-ensured by init-db).
  momo_mtn: { type: DataTypes.STRING(30), allowNull: true, defaultValue: null },
  momo_orange: { type: DataTypes.STRING(30), allowNull: true, defaultValue: null },

  // Persistent profile picture (URL). Stored as VARCHAR(1000) NULL.
  // Migration: backend/scripts/migrate-profile-picture.js (also auto-ensured by init-db).
  profile_picture: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    defaultValue: null,
  },

  // Soft-delete flag to avoid FK constraint errors when users have bookings/carts.
  // When true, admin should treat the user as deleted.
  is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

});


