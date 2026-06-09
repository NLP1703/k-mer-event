import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { User } from './User.js';
import { Event } from './Event.js';

// A user's request to be notified when seats free up for a full event.
// Table: waitlists (migration: scripts/migrate-waitlist.js).
export const Waitlist = sequelize.define('Waitlist', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  event_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  // Snapshot of the requester so the notification can be sent even if the
  // profile changes later.
  name: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  // waiting   -> still queued
  // notified  -> emailed that seats are available
  // converted -> the user booked after being notified
  status: {
    type: DataTypes.ENUM('waiting', 'notified', 'converted'),
    defaultValue: 'waiting',
  },
  notified_at: { type: DataTypes.DATE, allowNull: true },
});

Waitlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Waitlist.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
