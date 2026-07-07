import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import Sequelize from 'sequelize';
import { sequelize } from '../config/db.js';
import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';
import { BookingItem } from '../models/BookingItem.js';
import { Payment } from '../models/Payment.js';
import { Cart } from '../models/Cart.js';
import { Favorite } from '../models/Favorite.js';
import { Waitlist } from '../models/Waitlist.js';
import { User } from '../models/User.js';
import { notifyWaitlistForEvent } from './waitlistController.js';
import { emitEventsChanged } from '../config/realtime.js';

// Platform rule: an organizer may sell at most 250 tickets per event.
export const MAX_ORGANIZER_TICKETS = 250;

// Coerce a latitude/longitude into a valid number within range, else null.
const parseCoordinate = (raw, kind) => {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const limit = kind === 'lat' ? 90 : 180;
  if (n < -limit || n > limit) return null;
  return n;
};

// Accept http(s):// or protocol-relative // URLs, plus relative app paths (/uploads/...).
// Reject javascript:, data:, anything else; trim and cap at 1000 chars to match DB column.
const sanitizeUrl = (raw) => {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.length > 1000) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return null;
  if (
    value.startsWith('/') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  ) {
    return value;
  }
  return null;
};

const normalizePhotoUrls = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        // fallthrough
      }
    }
    return trimmed
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
  }
  return [];
};

// Whitelisted sortable columns -> guards against SQL injection via ?sort=.
const SORTABLE = {
  date: 'start_date',
  start_date: 'start_date',
  price: 'ticket_price',
  created: 'created_at',
  title: 'title',
};

export const listEvents = async (req, res, next) => {
  try {
    const { search, city, category, status, admin, organizer_id, sort, order } = req.query;

    // Pagination: page >= 1, limit in [1, 100], default 12.
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
    const offset = (page - 1) * limit;

    const where = {};
    const normalizedSearch = `${search ?? ''}`.trim();

    // Multi-column search (title, description, venue, city). Backed by indexes
    // (scripts/migrate-search-index.js) and ready to swap for FULLTEXT/Elastic.
    if (normalizedSearch) {
      const like = { [Op.like]: `%${normalizedSearch}%` };
      where[Op.or] = [
        { title: like },
        { description: like },
        { venue: like },
        { city: like },
      ];
    }

    if (typeof city === 'string' && city.trim()) where.city = city.trim();
    if (typeof category === 'string' && category.trim()) where.category = category.trim();

    const isAdmin = admin === 'true' && req.user?.role === 'admin';
    if (isAdmin) {
      if (typeof status === 'string' && status.trim()) where.status = status.trim();
    } else {
      // Public view: only published events are ever listed.
      where.status = 'published';
      // ...and never past/archived events (auto-archived once their date passes).
      where.archived_at = { [Op.is]: null };
    }

    // Organizers can scope to their own events (now a real FK column).
    if (typeof organizer_id === 'string' && organizer_id.trim()) {
      where.organizer_id = organizer_id.trim();
    }

    const sortCol = SORTABLE[(`${sort ?? ''}`).toLowerCase()] || 'start_date';
    const sortDir = (`${order ?? ''}`).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [[sortCol, sortDir]],
      limit,
      offset,
    });

    const totalPages = Math.max(Math.ceil(count / limit), 1);
    const pagination = {
      page,
      limit,
      total: count,
      totalPages,
      next: page < totalPages ? page + 1 : null,
      previous: page > 1 ? page - 1 : null,
    };

    let events = rows;

    // Admin augmentation: sales stats per event. Computed with TWO grouped
    // queries (sold tickets + distinct buyers) restricted to the current page's
    // event ids — no per-event N+1, no full-table in-memory reduce.
    if (isAdmin && rows.length) {
      const ids = rows.map((e) => e.id);

      const soldRows = await Booking.findAll({
        attributes: ['event_id', [Sequelize.fn('SUM', Sequelize.col('quantity')), 'sold']],
        where: { status: 'confirmed', event_id: { [Op.in]: ids } },
        group: ['event_id'],
        raw: true,
      });
      const soldByEvent = Object.fromEntries(soldRows.map((r) => [r.event_id, Number(r.sold) || 0]));

      const buyerRows = await Booking.findAll({
        attributes: ['event_id', 'customer_name'],
        where: { status: 'confirmed', event_id: { [Op.in]: ids } },
        include: [{ model: User, as: 'user', attributes: ['name'] }],
      });
      const buyersByEvent = {};
      for (const b of buyerRows) {
        const name = b.user?.name || b.customer_name || 'Utilisateur inconnu';
        (buyersByEvent[b.event_id] ||= new Set()).add(name);
      }

      events = rows.map((event) => ({
        ...event.get({ plain: true }),
        sold_tickets: soldByEvent[event.id] || 0,
        buyers: Array.from(buyersByEvent[event.id] || []),
      }));
    }

    return res.json({ events, pagination });
  } catch (error) {
    console.error('[listEvents] failed', {
      url: req.originalUrl,
      errorName: error?.name,
      message: error?.message,
    });
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

    const isOrganizer = req.user?.role === 'organizer';

    const {
      title,
      description,
      category,
      venue,
      city,
      organizer,
      banner_url,
      video_url,
      photo_urls,
      latitude,
      longitude,
      start_date,
      end_date,
      ticket_price,
      ticket_quantity,
      tags,
      social_links,
      status: requestedStatus,
    } = req.body;

    // Ticketing is optional — empty/absent values mean "no ticketing" (0).
    const quantity = Number(ticket_quantity) || 0;

    // Cap the number of sellable places for organizers (platform rule).
    if (isOrganizer && quantity > MAX_ORGANIZER_TICKETS) {
      return res.status(422).json({
        message: `Le nombre de places est limité à ${MAX_ORGANIZER_TICKETS} par événement.`,
      });
    }

    const eventPayload = {
      title,
      description,
      category,
      venue,
      city,
      // Organizer can never spoof another organizer name on create.
      organizer: isOrganizer ? (req.user?.name ?? '').toString().trim() : organizer,
      banner_url: sanitizeUrl(banner_url),
      video_url: sanitizeUrl(video_url),
      photo_urls: normalizePhotoUrls(photo_urls),
      latitude: parseCoordinate(latitude, 'lat'),
      longitude: parseCoordinate(longitude, 'lng'),
      start_date,
      end_date,
      ticket_price: Number(ticket_price) || 0,
      ticket_quantity: quantity,
      remaining_tickets: quantity,
      tags,
      social_links,
      // Workflow: organizer proposes -> pending, admin can choose.
      status: isOrganizer ? 'pending' : (requestedStatus || 'published'),
      // Ownership: org events get the organizer's id (virtual today, real when migrated)
      organizer_id: isOrganizer ? req.user.id : null,
    };

    const event = await Event.create(eventPayload);

    emitEventsChanged('created', event);
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

    const isOrganizer = req.user?.role === 'organizer';

    // Whitelist of fields an organizer is allowed to mutate.
    // Admin may edit anything except identifier columns.
    const organizerAllowed = new Set([
      'title',
      'description',
      'category',
      'venue',
      'city',
      'banner_url',
      'video_url',
      'photo_urls',
      'latitude',
      'longitude',
      'start_date',
      'end_date',
      'ticket_price',
      'ticket_quantity',
      'tags',
      'social_links',
    ]);

    const updateData = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'id' || key === 'organizer_id') continue;
      if (isOrganizer && !organizerAllowed.has(key)) continue;
      updateData[key] = value;
    }

    // Security/ownership: organizer cannot change the owner identity.
    // Since DB has no organizer_id, `event.organizer` is the ownership marker.
    if (isOrganizer) {
      updateData.organizer = (req.user?.name ?? '').toString().trim();
    }

    if ('banner_url' in updateData) {
      updateData.banner_url = sanitizeUrl(updateData.banner_url);
    }
    if ('video_url' in updateData) {
      updateData.video_url = sanitizeUrl(updateData.video_url);
    }
    if ('photo_urls' in updateData) {
      updateData.photo_urls = normalizePhotoUrls(updateData.photo_urls);
    }
    if ('latitude' in updateData) {
      updateData.latitude = parseCoordinate(updateData.latitude, 'lat');
    }
    if ('longitude' in updateData) {
      updateData.longitude = parseCoordinate(updateData.longitude, 'lng');
    }

    if (updateData.ticket_price != null) {
      updateData.ticket_price = Number(updateData.ticket_price);
    }
    if (updateData.ticket_quantity != null) {
      const requestedQuantity = Number(updateData.ticket_quantity);

      // Cap the number of sellable places for organizers (platform rule).
      if (isOrganizer && requestedQuantity > MAX_ORGANIZER_TICKETS) {
        return res.status(422).json({
          message: `Le nombre de places est limité à ${MAX_ORGANIZER_TICKETS} par événement.`,
        });
      }

      const soldTickets = (await Booking.sum('quantity', {
        where: { event_id: event.id, status: 'confirmed' },
      })) || 0;

      updateData.ticket_quantity = requestedQuantity;
      updateData.remaining_tickets = Math.max(requestedQuantity - soldTickets, 0);
    }

    // Snapshot seat availability before the update so we can detect when
    // capacity increases (a place freeing up) and notify the waitlist.
    const previousRemaining = Number(event.remaining_tickets) || 0;

    await event.update(updateData);

    // If seats became available (and the event is bookable), notify the queue.
    const newRemaining = Number(event.remaining_tickets) || 0;
    if (newRemaining > previousRemaining && newRemaining > 0 && event.status === 'published') {
      // Best-effort; never block the response on email delivery.
      notifyWaitlistForEvent(event.id, newRemaining - previousRemaining).catch(() => {});
    }

    emitEventsChanged('updated', event);
    res.json({ event });

  } catch (error) {
    next(error);
  }
};

export const cancelEventByAdmin = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Admin can cancel pending events (and keep the system consistent with the propose/validate workflow)
    if (event.status !== 'pending') {
      return res.status(409).json({ message: 'Event is not pending' });
    }

    await event.update({ status: 'cancelled' });
    emitEventsChanged('updated', event);
    return res.json({ event });
  } catch (error) {
    next(error);
  }
};

export const approveEventByAdmin = async (req, res, next) => {
  // Admin approves only pending events -> published
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.status !== 'pending') {
      return res.status(409).json({ message: 'Event is not pending' });
    }

    await event.update({ status: 'published' });
    emitEventsChanged('updated', event);
    return res.json({ event });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  // Deleting an event must also remove every row that references it, otherwise
  // the NOT-NULL foreign keys (bookings.event_id, carts.event_id, …) block the
  // DELETE and it fails with a constraint error. We remove the dependents in FK
  // order inside a single transaction so the whole thing is atomic.
  const t = await sequelize.transaction();
  try {
    const event = await Event.findByPk(req.params.id, { transaction: t });
    if (!event) {
      await t.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }
    const deletedId = event.id;

    // Bookings first: remove their own dependents (payments, booking items)
    // before the bookings themselves.
    const bookings = await Booking.findAll({
      where: { event_id: deletedId },
      attributes: ['id'],
      transaction: t,
    });
    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length) {
      await Payment.destroy({ where: { booking_id: { [Op.in]: bookingIds } }, transaction: t });
      await BookingItem.destroy({ where: { booking_id: { [Op.in]: bookingIds } }, transaction: t });
      await Booking.destroy({ where: { id: { [Op.in]: bookingIds } }, transaction: t });
    }

    // Remaining event-scoped rows: carts, waitlist entries, favourites.
    await Cart.destroy({ where: { event_id: deletedId }, transaction: t });
    await Waitlist.destroy({ where: { event_id: deletedId }, transaction: t });
    await Favorite.destroy({ where: { event_id: deletedId }, transaction: t });

    await event.destroy({ transaction: t });
    await t.commit();

    emitEventsChanged('deleted', { id: deletedId });
    res.status(204).end();
  } catch (error) {
    try { await t.rollback(); } catch { /* already settled */ }
    next(error);
  }
};
