import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// Lightweight activity trail used to compute "platform usage per week"
// (weekly active users) on the admin dashboard. One row is written per
// authenticated user at most once every few minutes (throttled in the
// trackActivity middleware) so the table stays small while still capturing
// daily/weekly active-user coverage.
// Table: activity_log (migration: scripts/migrate-activity.js).
export const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // The acting user. Kept as a plain UUID (no FK) so deleting a user never
    // blocks on historical activity rows.
    user_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'activity_log',
    indexes: [
      { fields: ['created_at'] },
      { fields: ['user_id'] },
    ],
  },
);
