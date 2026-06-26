import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

// ─────────────────────────────────────────────────────────────────────────────
// Presence tracking
// ─────────────────────────────────────────────────────────────────────────────
// Logged-in users currently connected. Keyed by userId so multiple tabs/devices
// for the same person count as one online user (with `connections` sockets).
//   userId -> { id, name, role, since: ISO string, connections: number }
const onlineUsers = new Map();
// Sockets with no valid token (anonymous visitors). We only keep a count.
let guestCount = 0;

const presenceSnapshot = () => {
  const users = Array.from(onlineUsers.values()).map(({ id, name, role, since }) => ({
    id,
    name,
    role,
    since,
  }));
  return {
    users,
    totalUsers: users.length,
    guests: guestCount,
    totalOnline: users.length + guestCount,
  };
};

// Push the current presence snapshot to every connected admin (room 'admins').
const broadcastPresence = () => {
  if (!io) return;
  io.to('admins').emit('presence:update', presenceSnapshot());
};

// Public read accessor for the REST snapshot endpoint.
export const getPresence = () => presenceSnapshot();

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

  // Optional auth handshake: a token identifies the user for presence, but is
  // never required — anonymous visitors still connect (counted as guests).
  io.use((socket, next) => {
    const token = socket.handshake?.auth?.token;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'kmersecret';
        const payload = jwt.verify(token, secret);
        socket.data.user = { id: payload?.id, role: payload?.role };
      } catch {
        // invalid/expired token -> treat as guest
        socket.data.user = null;
      }
    }
    next();
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;

    if (user?.id) {
      // Resolve a display name (token only carries id + role).
      let name = null;
      try {
        const { User } = await import('../models/User.js');
        const record = await User.findByPk(user.id, { attributes: ['name'] });
        name = record?.name ?? null;
      } catch {
        name = null;
      }

      const existing = onlineUsers.get(user.id);
      if (existing) {
        existing.connections += 1;
      } else {
        onlineUsers.set(user.id, {
          id: user.id,
          name,
          role: user.role,
          since: new Date().toISOString(),
          connections: 1,
        });
      }

      // Admins receive live presence updates.
      if (user.role === 'admin') socket.join('admins');
      broadcastPresence();
    } else {
      guestCount += 1;
      broadcastPresence();
    }

    socket.on('disconnect', () => {
      if (user?.id) {
        const entry = onlineUsers.get(user.id);
        if (entry) {
          entry.connections -= 1;
          if (entry.connections <= 0) onlineUsers.delete(user.id);
        }
      } else {
        guestCount = Math.max(0, guestCount - 1);
      }
      broadcastPresence();
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
