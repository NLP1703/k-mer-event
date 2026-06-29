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

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const v = this.getDataValue('amount');
        return v == null ? 0 : parseFloat(v);
      },
    },

    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'FCFA' },

    // External provider reference (charge id, etc.) for future Stripe/PayPal/OM.
    provider_ref: { type: DataTypes.STRING, allowNull: true },
    // Free-form audit of status transitions (created/confirmed/refunded...).
    meta: { type: DataTypes.TEXT, allowNull: true },

  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  },
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


