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
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    get() {
      const v = this.getDataValue('total_price');
      return v == null ? 0 : parseFloat(v);
    },
  },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'), defaultValue: 'confirmed' },
  qr_code_url: { type: DataTypes.TEXT },
  customer_name: { type: DataTypes.STRING },
  customer_email: { type: DataTypes.STRING },
  customer_phone: { type: DataTypes.STRING },
  // Set when the ticket is validated at the entrance (QR check-in).
  checked_in_at: { type: DataTypes.DATE, allowNull: true },
});

Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Booking.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Reverse (one-to-many) associations. Required by the admin dashboard, which
// includes `Event` -> bookings (event performance) and lets us load a user's
// bookings. Without these, Sequelize throws "Booking is not associated to
// Event!" and the whole /api/dashboard response becomes an error object,
// leaving every stat card and chart empty.
Event.hasMany(Booking, { foreignKey: 'event_id', as: 'bookings' });
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });

// Referential ownership of an event by an organizer (events.organizer_id).
Event.belongsTo(User, { foreignKey: 'organizer_id', as: 'organizerUser' });
User.hasMany(Event, { foreignKey: 'organizer_id', as: 'events' });
