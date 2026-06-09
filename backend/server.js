import http from 'http';
import app from './app.js';
import { sequelize } from './config/db.js';
import { initSocket } from './config/realtime.js';

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Wrap Express in an HTTP server so Socket.IO can share the same port.
    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Backend running at http://localhost:${PORT} (HTTP + WebSocket)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server', error);
    process.exit(1);
  }
};

start();
