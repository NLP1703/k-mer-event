import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const userPublicFields = ['id', 'name', 'email', 'role', 'telephone', 'avatar_url'];

export const listUsersForAdmin = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: userPublicFields,
      where: { is_deleted: false },
      order: [['created_at', 'DESC']],
    });


    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const getUserForAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: userPublicFields,
      where: { is_deleted: false },
    });


    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Admin create: we only allow admin to set profile fields.
// Password is required for user creation, but we DO NOT expose/allow changing it in update.
export const createUserForAdmin = async (req, res, next) => {
  try {
    const { name, telephone, email, role, avatar_url, password } = req.body;

    if (!name || !email) {
      return res.status(422).json({ message: 'name and email are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password || email, 12);

    const user = await User.create({
      name,
      telephone,
      email,
      role: role || 'user',
      avatar_url,
      password: hashedPassword,
    });

    res.status(201).json({ user: userPublicFields.reduce((acc, k) => ({ ...acc, [k]: user[k] }), {}) });
  } catch (error) {
    next(error);
  }
};

export const updateUserForAdmin = async (req, res, next) => {
  try {
    const { name, telephone, email, role, avatar_url } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Email uniqueness (if changed)
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: 'Email is already registered' });
      }
      user.email = email;
    }

    if (name !== undefined) user.name = name;
    if (telephone !== undefined) user.telephone = telephone;
    if (role !== undefined) user.role = role;
    if (avatar_url !== undefined) user.avatar_url = avatar_url;

    await user.save();

    const updated = await User.findByPk(user.id, { attributes: userPublicFields });
    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteUserForAdmin = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete: avoid FK constraint errors from Booking/Cart referencing this user.
    // Keep historical records intact.
    user.is_deleted = true;
    await user.save();

    res.json({ message: 'User deleted' });

  } catch (error) {
    // If soft-delete fails for any reason, surface as a controlled error.
    // (Foreign-key constraint errors should no longer happen because we no longer call user.destroy()).
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ message: 'Cannot delete user with existing dependent records' });
    }


    // Help surface the request id in logs even when errorHandler is generic.
    // eslint-disable-next-line no-console
    console.error('deleteUserForAdmin failed:', { id: req.params.id, errorName: error?.name, errorMessage: error?.message });
    next(error);
  }
};





