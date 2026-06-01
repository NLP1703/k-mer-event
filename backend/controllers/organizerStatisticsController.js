import { Op, fn, col, literal } from 'sequelize';
import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';

// Ownership filter for the current organizer.
// `organizer_id` is currently VIRTUAL in the schema, so we fall back to the
// string column `organizer` matching the user's name (the same pattern used
// by middlewares/auth.js and organizerEventsController.js).
const buildOwnerWhere = (user) => {
  const userName = (user?.name ?? '').toString().trim();
  if (!userName) return null;
  return { organizer: userName };
};

const requireOrganizer = (req, res) => {
  if (req.user?.role !== 'organizer') {
    res.status(403).json({ message: 'Forbidden: organizer access only' });
    return false;
  }
  return true;
};

// GET /api/organizer/statistics
// Returns global stats restricted to events the current organizer owns.
export const getOrganizerStatistics = async (req, res, next) => {
  try {
    if (!requireOrganizer(req, res)) return;

    const ownerWhere = buildOwnerWhere(req.user);
    if (!ownerWhere) {
      return res.json({
        statistics: {
          total_events: 0,
          total_tickets_sold: 0,
          total_revenue: 0,
        },
      });
    }

    const myEvents = await Event.findAll({
      where: ownerWhere,
      attributes: ['id'],
      raw: true,
    });
    const myEventIds = myEvents.map((e) => e.id);

    if (!myEventIds.length) {
      return res.json({
        statistics: {
          total_events: 0,
          total_tickets_sold: 0,
          total_revenue: 0,
        },
      });
    }

    const [aggRow] = await Booking.findAll({
      where: {
        event_id: { [Op.in]: myEventIds },
        status: 'confirmed',
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_tickets_sold'],
        [fn('COALESCE', fn('SUM', col('total_price')), 0), 'total_revenue'],
      ],
      raw: true,
    });

    return res.json({
      statistics: {
        total_events: myEventIds.length,
        total_tickets_sold: Number(aggRow?.total_tickets_sold || 0),
        total_revenue: Number(aggRow?.total_revenue || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/organizer/statistics/events
// Returns per-event statistics restricted to events the current organizer owns.
export const getOrganizerEventStatistics = async (req, res, next) => {
  try {
    if (!requireOrganizer(req, res)) return;

    const ownerWhere = buildOwnerWhere(req.user);
    if (!ownerWhere) return res.json({ events: [] });

    const events = await Event.findAll({
      where: ownerWhere,
      order: [['start_date', 'DESC']],
      raw: true,
    });

    if (!events.length) return res.json({ events: [] });

    const eventIds = events.map((e) => e.id);

    const salesRows = await Booking.findAll({
      where: { event_id: { [Op.in]: eventIds }, status: 'confirmed' },
      attributes: [
        'event_id',
        [fn('COALESCE', fn('SUM', col('quantity')), 0), 'sold_tickets'],
        [fn('COALESCE', fn('SUM', col('total_price')), 0), 'revenue'],
      ],
      group: ['event_id'],
      raw: true,
    });

    const salesMap = salesRows.reduce((acc, row) => {
      acc[row.event_id] = {
        sold_tickets: Number(row.sold_tickets || 0),
        revenue: Number(row.revenue || 0),
      };
      return acc;
    }, {});

    const enriched = events.map((event) => {
      const sales = salesMap[event.id] || { sold_tickets: 0, revenue: 0 };
      const capacity = Number(event.ticket_quantity || 0);
      const remaining = Number(event.remaining_tickets ?? Math.max(capacity - sales.sold_tickets, 0));
      const fillRate = capacity > 0 ? Math.min(100, (sales.sold_tickets / capacity) * 100) : 0;
      return {
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        status: event.status,
        ticket_quantity: capacity,
        sold_tickets: sales.sold_tickets,
        remaining_tickets: remaining,
        revenue: sales.revenue,
        fill_rate: Number(fillRate.toFixed(2)),
      };
    });

    return res.json({ events: enriched });
  } catch (error) {
    next(error);
  }
};

// Suppress unused-import warning while keeping `literal` available for
// callers that need raw SQL fragments in the future.
export const _internal = { literal };
