import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { User } from './User.js';
import { Event } from './Event.js';

export const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  event_id: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  total_price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'), defaultValue: 'confirmed' },
  qr_code_url: { type: DataTypes.TEXT },
  customer_name: { type: DataTypes.STRING },
  customer_email: { type: DataTypes.STRING },
  customer_phone: { type: DataTypes.STRING },
});

Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Booking.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
