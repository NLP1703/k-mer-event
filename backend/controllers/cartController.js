import { validationResult } from 'express-validator';
import { Cart } from '../models/Cart.js';
import { Event } from '../models/Event.js';

export const getCart = async (req, res, next) => {
  try {
    const items = await Cart.findAll({ where: { user_id: req.user.id }, include: ['event'] });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { eventId, quantity } = req.body;
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const [item, created] = await Cart.findOrCreate({
      where: { user_id: req.user.id, event_id: eventId },
      defaults: { quantity },
    });

    if (!created) {
      await item.update({ quantity });
    }

    const items = await Cart.findAll({ where: { user_id: req.user.id }, include: ['event'] });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    await Cart.destroy({ where: { user_id: req.user.id, event_id: eventId } });
    const items = await Cart.findAll({ where: { user_id: req.user.id }, include: ['event'] });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    await Cart.destroy({ where: { user_id: req.user.id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
