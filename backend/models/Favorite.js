import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { User } from './User.js';
import { Event } from './Event.js';

// Server-side favourites so a user's saved events sync across devices instead of
// living only in browser localStorage. (user_id, event_id) is unique.
export const Favorite = sequelize.define(
  'Favorite',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    event_id: { type: DataTypes.UUID, allowNull: false },
  },
  {
    tableName: 'favorites',
    indexes: [
      { unique: true, fields: ['user_id', 'event_id'] },
      { fields: ['user_id'] },
    ],
  },
);

Favorite.belongsTo(Event, { foreignKey: 'event_id', as: 'event', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
