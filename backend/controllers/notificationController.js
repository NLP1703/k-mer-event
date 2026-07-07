import { Notification } from '../models/Notification.js';

// GET /api/notifications — the current user's notifications, newest first, plus
// the unread count for the navbar badge. Capped at a reasonable page size.
export const listMyNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    const rows = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit,
    });

    const unread = await Notification.count({
      where: { user_id: req.user.id, read_at: null },
    });

    res.json({ notifications: rows, unread });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read — mark one notification as read.
export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) return res.status(404).json({ message: 'Notification introuvable' });

    if (!notification.read_at) {
      notification.read_at = new Date();
      await notification.save();
    }
    res.json({ notification });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/read-all — mark every unread notification as read.
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { read_at: new Date() },
      { where: { user_id: req.user.id, read_at: null } },
    );
    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    next(error);
  }
};
