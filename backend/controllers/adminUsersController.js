import { User } from '../models/User.js';

export const listUsersForAdmin = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'telephone', 'avatar_url'],
      order: [['created_at', 'DESC']],
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

