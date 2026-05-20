import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { Sequelize } from 'sequelize';

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

    // Event performance (bookings per event)
    const eventPerformance = await Event.findAll({
      attributes: [
        'id',
        'title',
        [Sequelize.fn('COUNT', Sequelize.col('bookings.id')), 'booking_count'],
        [Sequelize.fn('SUM', Sequelize.col('bookings.total_price')), 'total_revenue']
      ],
      include: [{
        model: Booking,
        as: 'bookings',
        attributes: []
      }],
      group: ['Event.id', 'Event.title'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('bookings.id')), 'DESC']],
      limit: 10,
      raw: true
    });

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
