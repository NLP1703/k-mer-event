import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Booking } from './Booking.js';

export const Payment = sequelize.define(
  'Payment',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    provider: { type: DataTypes.STRING, allowNull: false, defaultValue: 'simulated' },

    amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'FCFA' },


  status: { type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
}, {
  indexes: [
    { fields: ['booking_id'] },
    { fields: ['status'] },
  ],
});

Payment.belongsTo(Booking, {
  foreignKey: 'booking_id',
  as: 'booking',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});


