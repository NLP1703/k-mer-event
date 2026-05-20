import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Payment } from '../models/Payment.js';

const decideOutcome = (req) => {
  // Simulé: si req.body.simulate === 'success' -> confirmé, sinon annulé
  // Si rien fourni, success.
  return (req.body?.simulate || 'success') === 'success' ? 'confirmed' : 'cancelled';
};

export const processPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(422).json({ errors: errors.array() });
    }

    const { bookingId, provider, amount } = req.body;
    const outcome = decideOutcome(req);

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

    // Sécurité anti-doublon : on déduit le stock uniquement lors du passage pending -> confirmed.
    // Si le booking a déjà été confirmé, on retourne l’état sans retrait supplémentaire.
    if (booking.status === 'confirmed') {
      return res.status(200).json({ message: 'Booking already confirmed', booking });
    }
    if (booking.status !== 'pending') {
      await t.rollback();
      return res.status(409).json({ message: 'Booking is not pending' });
    }

    const finalStatus = outcome;

    let payment = await Payment.create(

      {
        booking_id: booking.id,
        provider: provider || 'simulated',
        amount: Number(amount ?? booking.total_price),
        currency: 'FCFA',

        status: finalStatus === 'confirmed' ? 'confirmed' : 'cancelled',
      },
      { transaction: t }
    );

    if (finalStatus === 'confirmed') {
      // Déduction atomique du stock uniquement au moment confirmed
      // (booking a été créé en pending sans déduction stock)
      const dec = await Event.update(
        { remaining_tickets: sequelize.literal('remaining_tickets - ' + booking.quantity) },
        {
          where: {
            id: booking.event_id,
            remaining_tickets: { [Op.gte]: booking.quantity },
          },
          transaction: t,
        }
      );

      if (!dec[0]) {
        await t.rollback();
        return res.status(409).json({ message: 'Not enough tickets available for confirmation' });
      }

      await booking.update({ status: 'confirmed' }, { transaction: t });
    } else {
      // cancelled: pas de déduction stock à faire (puisque pending sans déduction)
      await booking.update({ status: 'cancelled' }, { transaction: t });
    }

    await t.commit();
    return res.status(200).json({ payment, booking });
  } catch (error) {
    try { await t.rollback(); } catch (e) {}
    next(error);
  }
};

export const getPaymentByBookingId = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ where: { booking_id: req.params.bookingId } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

