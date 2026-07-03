import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';

export const listOrganizerEventBookings = async (req, res, next) => {
  try {
    if (req.user?.role !== 'organizer') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { eventId } = req.params;
    const event = await Event.findByPk(eventId);

    if (!event) return res.status(404).json({ message: 'Event not found' });
    // organizer_id peut ne pas exister / être fiable dans le schéma.
    // Fallback sur le champ string `event.organizer`.
    if (event.organizer_id != null) {
      if (event.organizer_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: not your event' });
      }
    } else {
      const organizerField = (event.organizer ?? '').toString().trim();
      const userName = (req.user?.name ?? '').toString().trim();
      if (!organizerField || organizerField !== userName) {
        return res.status(403).json({ message: 'Forbidden: not your event' });
      }
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
        'checked_in_at',
        'customer_name',
        'customer_email',
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
        checked_in_at: plain.checked_in_at,
        checked_in: Boolean(plain.checked_in_at),
        created_at: plain.createdAt,
        // Prefer the linked account identity (unique user id + name); fall back
        // to the customer_* fields captured at checkout for guest-style buyers.
        attendee: {
          user_id: plain.user?.id ?? null,
          name: plain.user?.name ?? plain.customer_name ?? '—',
          email: plain.user?.email ?? plain.customer_email ?? null,
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

    if (event.organizer_id != null) {
      if (event.organizer_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: not your event' });
      }
    } else {
      const organizerField = (event.organizer ?? '').toString().trim();
      const userName = (req.user?.name ?? '').toString().trim();
      if (!organizerField || organizerField !== userName) {
        return res.status(403).json({ message: 'Forbidden: not your event' });
      }
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

