import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { User } from './User.js';

// In-app notifications. Each row targets a single user. `type` classifies the
// event (e.g. 'payment_received', 'ticket_confirmed', 'ticket_rejected') so the
// UI can pick an icon/colour. `data` is a free-form JSON blob (booking id,
// event id…) used for deep-linking. `read_at` is null until the user opens it.
export const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'info' },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.STRING(1000), allowNull: true },

    // Extra structured payload, persisted as a JSON string in a TEXT column.
    data: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('data');
        if (!raw) return null;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      },
      set(val) {
        this.setDataValue('data', val == null ? null : JSON.stringify(val));
      },
    },

    read_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  {
    tableName: 'notifications',
    indexes: [{ fields: ['user_id'] }, { fields: ['read_at'] }],
  },
);

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
