import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

export const sequelize = new Sequelize(process.env.DB_NAME || 'kmer_event', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
  host: process.env.DB_HOST || '127.0.0.1',
  dialect: 'mysql',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
});
