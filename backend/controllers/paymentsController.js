import { validationResult } from 'express-validator';
import { sequelize } from '../config/db.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Payment } from '../models/Payment.js';
import { deductStock, restoreStock } from '../services/bookingService.js';
import { getPaymentProvider } from '../services/paymentProvider.js';

const appendMeta = (existing, entry) => {
  let log = [];
  try {
    log = existing ? JSON.parse(existing) : [];
  } catch {
    log = [];
  }
  log.push({ ...entry, at: new Date().toISOString() });
  return JSON.stringify(log);
};

// POST /api/payments — create a Payment for a pending booking and attempt to
// charge it through the configured provider. On success the booking is
// confirmed and stock is atomically deducted; on failure both are cancelled.
export const processPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(422).json({ errors: errors.array() });
    }

    const { bookingId, provider, amount, simulate } = req.body;

    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: req.user.id },
      include: [{ model: Event, as: 'event' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!booking) {
      await t.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status === 'confirmed') {
      await t.rollback();
      return res.status(200).json({ message: 'Booking already confirmed', booking });
    }
    if (booking.status !== 'pending') {
      await t.rollback();
      return res.status(409).json({ message: 'Booking is not pending' });
    }

    const chargeAmount = Number(amount ?? booking.total_price);
    const gateway = getPaymentProvider(provider);

    // 1) Create the Payment record in `pending`.
    const payment = await Payment.create(
      {
        booking_id: booking.id,
        provider: gateway.name,
        amount: chargeAmount,
        currency: 'FCFA',
        status: 'pending',
        meta: appendMeta(null, { event: 'created', amount: chargeAmount }),
      },
      { transaction: t },
    );

    // 2) Charge via the provider abstraction.
    const result = await gateway.charge({ amount: chargeAmount, hint: simulate, booking });

    if (!result.success) {
      await payment.update(
        { status: 'cancelled', meta: appendMeta(payment.meta, { event: 'charge_failed' }) },
        { transaction: t },
      );
      await booking.update({ status: 'cancelled' }, { transaction: t });
      await t.commit();
      return res.status(402).json({ message: 'Payment failed', payment, booking });
    }

    // 3) Deduct stock atomically only on successful charge.
    const ok = await deductStock(booking.event_id, booking.quantity, t);
    if (!ok) {
      await t.rollback();
      return res.status(409).json({ message: 'Not enough tickets available for confirmation' });
    }

    await payment.update(
      {
        status: 'confirmed',
        provider_ref: result.reference,
        meta: appendMeta(payment.meta, { event: 'confirmed', reference: result.reference }),
      },
      { transaction: t },
    );
    await booking.update({ status: 'confirmed' }, { transaction: t });

    await t.commit();
    return res.status(200).json({ payment, booking });
  } catch (error) {
    try { await t.rollback(); } catch { /* settled */ }
    next(error);
  }
};

// POST /api/payments/:bookingId/refund — refund a confirmed payment. The owner
// or an admin may trigger it: the payment becomes `refunded`, the booking is
// cancelled and the stock is restored. Idempotent on an already-refunded one.
export const refundPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const where = { id: req.params.bookingId };
    if (req.user.role !== 'admin') where.user_id = req.user.id;

    const booking = await Booking.findOne({ where, transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) {
      await t.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    const payment = await Payment.findOne({
      where: { booking_id: booking.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ message: 'Payment not found' });
    }
    if (payment.status === 'refunded') {
      await t.rollback();
      return res.status(200).json({ message: 'Already refunded', payment, booking });
    }
    if (payment.status !== 'confirmed') {
      await t.rollback();
      return res.status(409).json({ message: 'Only a confirmed payment can be refunded' });
    }

    const gateway = getPaymentProvider(payment.provider);
    const result = await gateway.refund({ reference: payment.provider_ref, amount: payment.amount });
    if (!result.success) {
      await t.rollback();
      return res.status(502).json({ message: 'Refund failed at provider' });
    }

    await restoreStock(booking.event_id, booking.quantity, t);
    await payment.update(
      { status: 'refunded', meta: appendMeta(payment.meta, { event: 'refunded', reference: result.reference }) },
      { transaction: t },
    );
    await booking.update({ status: 'cancelled' }, { transaction: t });

    await t.commit();
    return res.status(200).json({ payment, booking });
  } catch (error) {
    try { await t.rollback(); } catch { /* settled */ }
    next(error);
  }
};

export const getPaymentByBookingId = async (req, res, next) => {
  try {
    // Non-admins can only read payments for their own bookings.
    const booking = await Booking.findOne({
      where:
        req.user.role === 'admin'
          ? { id: req.params.bookingId }
          : { id: req.params.bookingId, user_id: req.user.id },
    });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const payment = await Payment.findOne({ where: { booking_id: req.params.bookingId } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ payment });
  } catch (error) {
    next(error);
  }
};
