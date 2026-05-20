import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Booking } from './Booking.js';

export const BookingItem = sequelize.define('BookingItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_id: { type: DataTypes.UUID, allowNull: false },
  ticket_type: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
});

BookingItem.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });
