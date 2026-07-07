import { Notification } from '../models/Notification.js';
import { emitNotification } from '../config/realtime.js';

// Create a notification row for one user and push it live over the socket.
// Best-effort: notifications must never break the business flow that triggers
// them (a payment, a confirmation…), so failures are swallowed and logged.
// `data` is any JSON-serialisable payload (booking id, event id…).
export const createNotification = async ({ userId, type = 'info', title, body = null, data = null }) => {
  if (!userId || !title) return null;
  try {
    const notification = await Notification.create({ user_id: userId, type, title, body, data });
    const plain = notification.get({ plain: true });
    emitNotification(userId, plain);
    return plain;
  } catch (error) {
    console.warn('⚠️  createNotification failed:', error?.message || error);
    return null;
  }
};
