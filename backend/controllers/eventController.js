import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';

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

export const listEvents = async (req, res, next) => {
  try {
    const { search, city, category, status, admin, organizer_id } = req.query;
    const filters = { where: {} };

    // Toujours coerce la valeur en string pour éviter tout crash si query.search est vide/undefined
    const normalizedSearch = ((search ?? '') + '').trim();

    // Logs pour diagnostiquer les 500 côté backend
    if (process.env.NODE_ENV !== 'production') {
      console.log('[listEvents] query=', { search, city, category, status, admin, originalUrl: req.originalUrl });
      console.log('[listEvents] normalizedSearch=', normalizedSearch);
    }


    if (normalizedSearch) {
      // Utilise la colonne exacte du model Sequelize
      filters.where.title = { [Op.like]: `%${normalizedSearch}%` };
    }


    if (typeof city === 'string' && city.trim()) filters.where.city = city.trim();
    if (typeof category === 'string' && category.trim()) filters.where.category = category.trim();
    // Public view: only show published by default (admin can override with ?status=...)
    if (admin === 'true') {
      if (typeof status === 'string' && status.trim()) filters.where.status = status.trim();
    } else {
      filters.where.status = 'published';
    }
    // organizer_id filtering removed because the current DB schema may not include this column.
    // If/when the column is added, we can re-enable this filter.

    const events = await Event.findAll({

      ...filters,
      order: [['start_date', 'ASC']],
      limit: 40,
    });

    // Admin augmentation: sales stats per event
    if (admin === 'true') {
      try {
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
      } catch (adminError) {
        console.error('[listEvents] admin augmentation failed (non-fatal)', {
          url: req.originalUrl,
          query: req.query,
          errorName: adminError?.name,
          message: adminError?.message,
          stack: adminError?.stack,
        });
        // On continue sans stats admin
      }
    }

    return res.json({ events });
  } catch (error) {
    console.error('[listEvents] failed', {
      url: req.originalUrl,
      query: req.query,
      errorName: error?.name,
      message: error?.message,
      stack: error?.stack,
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
      start_date,
      end_date,
      ticket_price,
      ticket_quantity,
      tags,
      social_links,
      status: requestedStatus,
    } = req.body;

    const quantity = Number(ticket_quantity);

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
      start_date,
      end_date,
      ticket_price: Number(ticket_price),
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

    await event.update(updateData);
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
    return res.json({ event });
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
