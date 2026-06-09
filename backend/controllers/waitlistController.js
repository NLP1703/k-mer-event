import { Op } from 'sequelize';
import { Waitlist } from '../models/Waitlist.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { sendWaitlistAvailability } from '../services/emailService.js';

const serialize = (entry) => {
  const plain = entry.get ? entry.get({ plain: true }) : entry;
  return {
    id: plain.id,
    event_id: plain.event_id,
    quantity: plain.quantity,
    status: plain.status,
    notified_at: plain.notified_at,
    createdAt: plain.createdAt,
    event: plain.event
      ? {
          id: plain.event.id,
          title: plain.event.title,
          city: plain.event.city,
          venue: plain.event.venue,
          start_date: plain.event.start_date,
          banner_url: plain.event.banner_url,
          remaining_tickets: plain.event.remaining_tickets,
        }
      : null,
  };
};

// POST /api/waitlist — join the waitlist for a full event.
// Body: { eventId, quantity }
export const joinWaitlist = async (req, res, next) => {
  try {
    const { eventId, quantity } = req.body || {};
    if (!eventId) return res.status(400).json({ message: 'eventId requis' });

    const qty = Math.max(1, Number(quantity) || 1);

    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });

    if (Number(event.remaining_tickets) >= qty) {
      return res.status(400).json({
        message: 'Des places sont disponibles, réservez directement.',
      });
    }

    // Avoid duplicate active entries for the same user/event.
    const existing = await Waitlist.findOne({
      where: { event_id: eventId, user_id: req.user.id, status: { [Op.ne]: 'converted' } },
    });
    if (existing) {
      existing.quantity = qty;
      if (existing.status === 'notified') existing.status = 'waiting';
      await existing.save();
      return res.status(200).json({ waitlist: serialize(existing), alreadyJoined: true });
    }

    const entry = await Waitlist.create({
      event_id: eventId,
      user_id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      quantity: qty,
      status: 'waiting',
    });

    return res.status(201).json({ waitlist: serialize(entry) });
  } catch (error) {
    next(error);
  }
};

// GET /api/waitlist/me — the current user's active waitlist entries.
export const getMyWaitlist = async (req, res, next) => {
  try {
    const entries = await Waitlist.findAll({
      where: { user_id: req.user.id, status: { [Op.ne]: 'converted' } },
      include: [{ model: Event, as: 'event' }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ waitlist: entries.map(serialize) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/waitlist/:id — leave the waitlist (own entry only).
export const leaveWaitlist = async (req, res, next) => {
  try {
    const entry = await Waitlist.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!entry) return res.status(404).json({ message: 'Inscription introuvable' });
    await entry.destroy();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// Notify waiting users that seats are available for an event.
// Called (best-effort) when an event's capacity increases. Notifies the
// oldest-waiting entries first, up to the number of available seats.
export const notifyWaitlistForEvent = async (eventId, availableSeats) => {
  try {
    const seats = Number(availableSeats);
    if (!Number.isFinite(seats) || seats <= 0) return 0;

    const event = await Event.findByPk(eventId);
    if (!event) return 0;

    const waiting = await Waitlist.findAll({
      where: { event_id: eventId, status: 'waiting' },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
      order: [['createdAt', 'ASC']],
    });
    if (!waiting.length) return 0;

    // Notify entries until we run out of freed seats.
    let remaining = seats;
    let notified = 0;
    for (const entry of waiting) {
      if (remaining <= 0) break;
      await sendWaitlistAvailability(entry, event);
      entry.status = 'notified';
      entry.notified_at = new Date();
      await entry.save();
      remaining -= Number(entry.quantity) || 1;
      notified += 1;
    }
    return notified;
  } catch (error) {
    console.error('⚠️ notifyWaitlistForEvent failed (non-fatal):', error?.message || error);
    return 0;
  }
};
