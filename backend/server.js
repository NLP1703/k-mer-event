import http from 'http';
import app from './app.js';
import { sequelize } from './config/db.js';
import { initSocket } from './config/realtime.js';
import { startEventArchiver } from './services/eventArchiver.js';
import { ensureSchema } from './services/ensureSchema.js';
import { config, validateEnv } from './config/env.js';

// Refuse to boot with a missing/weak JWT secret or other invalid configuration.
validateEnv();

const PORT = config.port;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Self-healing schema guard: ensure the newest columns/tables exist so a
    // deploy that didn't run the migrations still boots into a working state.
    await ensureSchema();

    // Wrap Express in an HTTP server so Socket.IO can share the same port.
    const server = http.createServer(app);
    initSocket(server);

    // Periodically archive events whose date has passed (removes them from the
    // public listing while keeping them in the organizer's statistics/history).
    startEventArchiver();

    server.listen(PORT, () => {
      console.log(`🚀 Backend running at http://localhost:${PORT} (HTTP + WebSocket)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server', error);
    process.exit(1);
  }
};

start();
