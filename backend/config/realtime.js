import { Server } from 'socket.io';

let io = null;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

// Public tunnels used to share the survey (Cloudflare, ngrok, localtunnel).
const isTunnel = (origin) => {
  try {
    return /\.(trycloudflare\.com|ngrok-free\.app|ngrok\.io|loca\.lt)$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

// Attach a Socket.IO server to the given HTTP server. Realtime data here is
// public (event changes, survey counts), so no auth handshake is required.
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || isLocalhost(origin) || isTunnel(origin)) {
          return callback(null, true);
        }
        // Don't throw (avoids noisy errors); just refuse CORS for this origin.
        return callback(null, false);
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

// Broadcast that a new survey response was recorded so the live admin dashboard
// can refresh instantly. Carries the new total for a lightweight UI update.
export const emitSurveyResponse = (total) => {
  if (!io) return;
  io.emit('survey:new', { total });
};
