import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { sequelize } from '../config/db.js';
import '../models/index.js';
import { User } from '../models/User.js';

dotenv.config();

const DEFAULT_ADMIN = {
  email: 'adminkmer@gmail.com',
  password: 'AdminKmer123',
  role: 'admin',
  name: 'K-MER Admin',
  prenom: 'K-MER',
  telephone: '0000000000',
};

export async function seedAdmin() {
  const admin = {
    ...DEFAULT_ADMIN,
    ...(process.env.ADMIN_EMAIL ? { email: process.env.ADMIN_EMAIL } : {}),
    ...(process.env.ADMIN_PASSWORD ? { password: process.env.ADMIN_PASSWORD } : {}),
    ...(process.env.ADMIN_NAME ? { name: process.env.ADMIN_NAME } : {}),
    ...(process.env.ADMIN_PRENOM ? { prenom: process.env.ADMIN_PRENOM } : {}),
    ...(process.env.ADMIN_TELEPHONE ? { telephone: process.env.ADMIN_TELEPHONE } : {}),
  };

  await sequelize.authenticate();

  const existing = await User.findOne({ where: { email: admin.email } });

  if (existing) {
    // Ensure it is actually admin.
    if (existing.role !== 'admin') {
      await existing.update({ role: 'admin' });
    }

    // Always reseed password so admin login is deterministic.
    const hashedPassword = await bcrypt.hash(admin.password, 12);
    await existing.update({ password: hashedPassword });
    return existing;
  }



  const hashedPassword = await bcrypt.hash(admin.password, 12);

  const created = await User.create({
    name: admin.name,
    prenom: admin.prenom,
    telephone: admin.telephone,
    email: admin.email,
    password: hashedPassword,
    role: 'admin',
  });

  return created;
}

// If executed directly
if (process.argv[1] && process.argv[1].includes('seed-admin.js')) {
  seedAdmin()
    .then(() => {
      console.log('✅ Admin user seeded');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed admin:', err);
      process.exit(1);
    });
}

