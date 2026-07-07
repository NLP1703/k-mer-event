import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { sequelize } from '../config/db.js';
import { restoreStock } from '../services/bookingService.js';

// Shared ownership guard: an organizer may only act on their own events.
// Prefers the referential organizer_id; falls back to the legacy name match.
const organizerOwnsEvent = (event, user) => {
  if (event.organizer_id != null) return event.organizer_id === user.id;
  const organizerField = (event.organizer ?? '').toString().trim();
  const userName = (user?.name ?? '').toString().trim();
  return Boolean(organizerField) && organizerField === userName;
};

export const listOrganizerEventBookings = async (req, res, next) => {
  try {
    if (req.user?.role !== 'organizer') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { eventId } = req.params;
    const event = await Event.findByPk(eventId);

    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!organizerOwnsEvent(event, req.user)) {
      return res.status(403).json({ message: 'Forbidden: not your event' });
    }



    const rows = await Booking.findAll({
      where: { event_id: event.id },
      // Deliberately exclude qr_code_url: it's a large base64 payload the
      // attendee list never needs, and keeping it out keeps the response lean.
      attributes: [
        'id',
        'booking_number',
        'quantity',
        'status',
        'total_price',
        'payment_proof_url',
        'checked_in_at',
        'customer_name',
        'customer_email',
        'customer_phone',
        'createdAt',
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Shape a purposeful attendee list: the organizer cross-checks the buyer's
    // unique id / name and the booking number against what the QR scanner shows
    // at check-in. `checked_in` mirrors the entrance-validation state.
    const bookings = rows.map((b) => {
      const plain = b.get({ plain: true });
      return {
        id: plain.id,
        booking_number: plain.booking_number,
        quantity: plain.quantity,
        status: plain.status,
        // Amount to expect via Mobile Money, and whether payment is still due.
        amount: Number(plain.total_price) || 0,
        payment_pending: plain.status === 'pending',
        payment_proof_url: plain.payment_proof_url || null,
        checked_in_at: plain.checked_in_at,
        checked_in: Boolean(plain.checked_in_at),
        created_at: plain.createdAt,
        // Prefer the linked account identity (unique user id + name); fall back
        // to the customer_* fields captured at checkout for guest-style buyers.
        attendee: {
          user_id: plain.user?.id ?? null,
          name: plain.user?.name ?? plain.customer_name ?? '—',
          email: plain.user?.email ?? plain.customer_email ?? null,
          phone: plain.customer_phone ?? plain.user?.telephone ?? null,
        },
      };
    });

    return res.json({
      event: { id: event.id, title: event.title, start_date: event.start_date },
      count: bookings.length,
      total_tickets: bookings.reduce((sum, b) => sum + (b.quantity || 0), 0),
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganizerEventBooking = async (req, res, next) => {
  try {
    if (req.user?.role !== 'organizer') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { eventId, bookingId } = req.params;

    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!organizerOwnsEvent(event, req.user)) {
      return res.status(403).json({ message: 'Forbidden: not your event' });
    }


    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.event_id !== event.id) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.destroy();
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// PATCH /api/organizer/events/:eventId/bookings/:bookingId/status
// The organizer confirms (or rejects) a Mobile Money payment made directly to
// their number. Body: { status: 'confirmed' | 'cancelled' }.
//  - confirmed: only a `pending` booking can be confirmed (marks it paid).
//  - cancelled: releases the reserved seat back to stock.
export const updateOrganizerEventBookingStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    if (req.user?.role !== 'organizer') {
      await t.rollback();
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { eventId, bookingId } = req.params;
    const status = String(req.body?.status || '').trim();
    if (!['confirmed', 'cancelled'].includes(status)) {
      await t.rollback();
      return res.status(422).json({ message: 'status must be "confirmed" or "cancelled"' });
    }

    const event = await Event.findByPk(eventId, { transaction: t });
    if (!event) {
      await t.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }
    if (!organizerOwnsEvent(event, req.user)) {
      await t.rollback();
      return res.status(403).json({ message: 'Forbidden: not your event' });
    }

    const booking = await Booking.findOne({
      where: { id: bookingId, event_id: event.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!booking) {
      await t.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === status) {
      await t.rollback();
      return res.status(200).json({ booking: { id: booking.id, status: booking.status } });
    }

    if (status === 'confirmed') {
      if (booking.status !== 'pending') {
        await t.rollback();
        return res.status(409).json({ message: 'Only a pending booking can be confirmed' });
      }
      booking.status = 'confirmed';
    } else {
      // Cancelling releases the reserved seat (stock was deducted at checkout).
      // Only give stock back for bookings that were actually holding a seat.
      if (booking.status !== 'cancelled') {
        await restoreStock(event.id, booking.quantity, t);
      }
      booking.status = 'cancelled';
    }

    await booking.save({ transaction: t });
    await t.commit();
    return res.status(200).json({ booking: { id: booking.id, status: booking.status } });
  } catch (error) {
    try { await t.rollback(); } catch { /* already settled */ }
    next(error);
  }
};

