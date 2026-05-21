import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';

export const getBookingsForUserByAdmin = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role', 'telephone'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const bookings = await Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title', 'venue', 'start_date'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ user, bookings });
  } catch (error) {
    next(error);
  }
};

