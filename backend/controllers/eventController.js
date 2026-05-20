import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';

export const listEvents = async (req, res, next) => {
  try {
    const { search, city, category, status, admin } = req.query;
    const filters = { where: {} };

    if (search) filters.where.title = { [Op.like]: `%${search}%` };
    if (city) filters.where.city = city;
    if (category) filters.where.category = category;
    if (status) filters.where.status = status;

    const events = await Event.findAll({
      ...filters,
      order: [['start_date', 'ASC']],
      limit: 40,
    });

    if (admin === 'true') {
      const confirmedBookings = await Booking.findAll({
        where: { status: 'confirmed' },
        include: [{ model: User, as: 'user', attributes: ['name'] }],
      });

      const salesByEvent = confirmedBookings.reduce((map, booking) => {
        const eventId = booking.event_id;
        const buyerName = booking.user?.name || booking.customer_name || 'Utilisateur inconnu';

        if (!map[eventId]) {
          map[eventId] = { sold_tickets: 0, buyers: new Set() };
        }

        map[eventId].sold_tickets += booking.quantity;
        if (buyerName) {
          map[eventId].buyers.add(buyerName);
        }

        return map;
      }, {});

      const enhancedEvents = events.map((event) => {
        const plainEvent = event.get({ plain: true });
        const stats = salesByEvent[plainEvent.id] || { sold_tickets: 0, buyers: new Set() };
        return {
          ...plainEvent,
          sold_tickets: stats.sold_tickets,
          buyers: Array.from(stats.buyers),
        };
      });

      return res.json({ events: enhancedEvents });
    }

    res.json({ events });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ event });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const event = await Event.create({
      ...req.body,
      ticket_price: Number(req.body.ticket_price),
      ticket_quantity: Number(req.body.ticket_quantity),
      remaining_tickets: Number(req.body.ticket_quantity),
      photo_urls: Array.isArray(req.body.photo_urls)
        ? req.body.photo_urls.filter(Boolean)
        : typeof req.body.photo_urls === 'string'
        ? req.body.photo_urls.split(',').map((url) => url.trim()).filter(Boolean)
        : [],
    });
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const updateData = { ...req.body };
    if (updateData.ticket_price != null) {
      updateData.ticket_price = Number(updateData.ticket_price);
    }
    if (updateData.ticket_quantity != null) {
      const requestedQuantity = Number(updateData.ticket_quantity);
      const soldTickets = (await Booking.sum('quantity', {
        where: { event_id: event.id, status: 'confirmed' },
      })) || 0;

      updateData.ticket_quantity = requestedQuantity;
      updateData.remaining_tickets = Math.max(requestedQuantity - soldTickets, 0);
    }
    if (updateData.photo_urls != null) {
      updateData.photo_urls = Array.isArray(updateData.photo_urls)
        ? updateData.photo_urls.filter(Boolean)
        : typeof updateData.photo_urls === 'string'
        ? updateData.photo_urls.split(',').map((url) => url.trim()).filter(Boolean)
        : [];
    }

    await event.update(updateData);
    res.json({ event });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    await event.destroy();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
