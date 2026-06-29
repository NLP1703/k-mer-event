import { Sequelize } from 'sequelize';
import { config } from './env.js';

// In the test environment we use an in-memory SQLite database so the suite runs
// anywhere (CI included) with no MySQL server. Production/dev use MySQL.
export const sequelize = config.isTest
  ? new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      define: { underscored: true, timestamps: true },
    })
  : new Sequelize(config.db.name, config.db.user, config.db.password, {
      host: config.db.host,
      dialect: 'mysql',
      port: config.db.port,
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
      },
    });
