import { Server } from 'socket.io';

let io = null;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

// Attach a Socket.IO server to the given HTTP server. Realtime data here is
// public (event changes), so no auth handshake is required.
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || isLocalhost(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin not allowed by CORS (socket): ${origin}`));
      },
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      // no-op; read-only public realtime
    });
  });

  return io;
};

export const getIo = () => io;

// Broadcast that an event was created/updated/deleted so every connected client
// can refresh in real time. `type` is 'created' | 'updated' | 'deleted'.
export const emitEventsChanged = (type, eventOrId) => {
  if (!io) return;
  const plain = eventOrId?.get ? eventOrId.get({ plain: true }) : eventOrId;
  const eventId = plain?.id ?? null;
  io.emit('events:changed', {
    type,
    eventId,
    event: type === 'deleted' ? null : plain,
  });
};
