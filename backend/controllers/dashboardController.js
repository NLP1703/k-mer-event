import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { Sequelize } from 'sequelize';
import { sequelize } from '../config/db.js';
import { getPresence } from '../config/realtime.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    const totalEvents = await Event.count({ where: { status: 'published' } });
    const totalBookings = await Booking.count();
    const revenue = await Booking.sum('total_price') || 0;

    const topEvents = await Event.findAll({
      order: [['ticket_quantity', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'ticket_quantity', 'remaining_tickets']
    });

    // Revenue over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueData = await Booking.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('total_price')), 'revenue']
      ],
      where: {
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo }
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Bookings over last 30 days
    const bookingsData = await Booking.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'bookings']
      ],
      where: {
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo }
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Event performance (bookings per event). Done as a raw aggregate join:
    // Sequelize's COUNT(col('bookings.id')) + include + raw combination
    // mis-aliases the joined table ("Unknown column 'bookings.id'"), so we
    // express the join directly for a stable, predictable result.
    const [eventPerformance] = await sequelize.query(
      `SELECT e.id, e.title,
              COUNT(b.id) AS booking_count,
              COALESCE(SUM(b.total_price), 0) AS total_revenue
       FROM events e
       LEFT JOIN bookings b ON b.event_id = e.id
       GROUP BY e.id, e.title
       ORDER BY booking_count DESC
       LIMIT 10`,
    );

    // Recent bookings
    const recentBookings = await Booking.findAll({
      include: [
        { model: Event, as: 'event', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      totalUsers,
      totalEvents,
      totalBookings,
      revenue,
      topEvents,
      revenueData,
      bookingsData,
      eventPerformance,
      recentBookings
    });
  } catch (error) {
    next(error);
  }
};

// Snapshot of who is currently connected (for the initial dashboard load).
// Live updates afterwards arrive over Socket.IO ('presence:update').
export const getPresenceSnapshot = async (req, res, next) => {
  try {
    res.json(getPresence());
  } catch (error) {
    next(error);
  }
};

// ISO-8601 week key (yyyyww) matching MySQL YEARWEEK(date, 3), plus the Monday
// that starts that week. Used to align JS-generated week buckets with the
// SQL GROUP BY YEARWEEK(...) results.
const isoWeekInfo = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  // Shift to the Thursday of this week — its year/week defines the ISO week.
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date - firstThursday) / (7 * 24 * 3600 * 1000));
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return { key: date.getUTCFullYear() * 100 + week, monday };
};

// Platform usage per week: active users (distinct users with tracked activity),
// new signups, bookings and revenue. Returns the last `weeks` ISO weeks in
// chronological order, with zero-filled gaps so the chart is continuous.
export const getWeeklyUsage = async (req, res, next) => {
  try {
    const weeks = Math.min(Math.max(parseInt(req.query.weeks, 10) || 8, 1), 26);

    // Build the ordered list of week buckets (oldest -> newest).
    const buckets = [];
    const indexByKey = new Map();
    const cursor = new Date();
    for (let i = weeks - 1; i >= 0; i -= 1) {
      const d = new Date(cursor);
      d.setDate(d.getDate() - i * 7);
      const { key, monday } = isoWeekInfo(d);
      if (!indexByKey.has(key)) {
        indexByKey.set(key, buckets.length);
        buckets.push({
          week: key,
          weekStart: monday.toISOString().slice(0, 10),
          activeUsers: 0,
          newUsers: 0,
          bookings: 0,
          revenue: 0,
        });
      }
    }

    const since = buckets[0]?.weekStart || new Date().toISOString().slice(0, 10);

    const fill = (rows, field, caster = Number) => {
      for (const row of rows) {
        const idx = indexByKey.get(Number(row.yw));
        if (idx != null) buckets[idx][field] = caster(row.val) || 0;
      }
    };

    // activity_log may not exist on older databases — degrade gracefully.
    let activeRows = [];
    try {
      [activeRows] = await sequelize.query(
        `SELECT YEARWEEK(created_at, 3) AS yw, COUNT(DISTINCT user_id) AS val
         FROM activity_log
         WHERE created_at >= ?
         GROUP BY yw`,
        { replacements: [since] },
      );
    } catch {
      activeRows = [];
    }

    const [signupRows] = await sequelize.query(
      `SELECT YEARWEEK(created_at, 3) AS yw, COUNT(*) AS val
       FROM users
       WHERE created_at >= ?
       GROUP BY yw`,
      { replacements: [since] },
    );

    const [bookingRows] = await sequelize.query(
      `SELECT YEARWEEK(created_at, 3) AS yw, COUNT(*) AS val
       FROM bookings
       WHERE created_at >= ?
       GROUP BY yw`,
      { replacements: [since] },
    );

    const [revenueRows] = await sequelize.query(
      `SELECT YEARWEEK(created_at, 3) AS yw, COALESCE(SUM(total_price), 0) AS val
       FROM bookings
       WHERE created_at >= ?
       GROUP BY yw`,
      { replacements: [since] },
    );

    fill(activeRows, 'activeUsers');
    fill(signupRows, 'newUsers');
    fill(bookingRows, 'bookings');
    fill(revenueRows, 'revenue');

    res.json({ weeks: buckets });
  } catch (error) {
    next(error);
  }
};
