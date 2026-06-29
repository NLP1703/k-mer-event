import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// Audit trail of authentication attempts, used both for the journaling required
// by the brute-force protection and to compute progressive lockouts (count of
// recent failures per email and per IP). No FK to users: failed attempts often
// reference an email that does not (yet) map to an account.
export const LoginAttempt = sequelize.define(
  'LoginAttempt',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: 'login_attempts',
    indexes: [
      { fields: ['created_at'] },
      { fields: ['email'] },
      { fields: ['ip'] },
    ],
  },
);
