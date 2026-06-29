import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { User } from './User.js';

// Server-side refresh-token store. The raw token is NEVER persisted — only its
// SHA-256 hash — so a database leak cannot be replayed. Rotation is implemented
// by marking a row revoked and linking it to its successor via `replaced_by`,
// which also lets us detect refresh-token reuse (a stolen, already-rotated
// token) and revoke the whole family.
export const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    replaced_by: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.STRING, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'refresh_tokens',
    indexes: [
      { fields: ['user_id'] },
      { unique: true, fields: ['token_hash'] },
    ],
  },
);

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
