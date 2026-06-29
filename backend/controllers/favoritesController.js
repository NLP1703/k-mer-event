import { Favorite } from '../models/Favorite.js';
import { Event } from '../models/Event.js';

const listForUser = async (userId) => {
  const favorites = await Favorite.findAll({
    where: { user_id: userId },
    include: [{ model: Event, as: 'event' }],
    order: [['created_at', 'DESC']],
  });
  return {
    favorites,
    eventIds: favorites.map((f) => f.event_id),
  };
};

export const getFavorites = async (req, res, next) => {
  try {
    res.json(await listForUser(req.user.id));
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ message: 'eventId is required' });

    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    await Favorite.findOrCreate({ where: { user_id: req.user.id, event_id: eventId } });
    res.status(201).json(await listForUser(req.user.id));
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    await Favorite.destroy({ where: { user_id: req.user.id, event_id: req.params.eventId } });
    res.json(await listForUser(req.user.id));
  } catch (error) {
    next(error);
  }
};

// Merge a client's local (localStorage) favourites into the server set on login,
// so existing offline favourites are not lost when moving to multi-device sync.
export const syncFavorites = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.eventIds) ? req.body.eventIds : [];
    if (ids.length) {
      const existing = await Event.findAll({ where: { id: ids }, attributes: ['id'] });
      const valid = new Set(existing.map((e) => e.id));
      await Promise.all(
        ids
          .filter((id) => valid.has(id))
          .map((id) => Favorite.findOrCreate({ where: { user_id: req.user.id, event_id: id } })),
      );
    }
    res.json(await listForUser(req.user.id));
  } catch (error) {
    next(error);
  }
};
