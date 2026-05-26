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



    const bookings = await Booking.findAll({
      where: { event_id: event.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ bookings });
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

