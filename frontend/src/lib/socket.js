import { io } from 'socket.io-client';
import { getAccessToken } from '../services/api.js';

// The Socket.IO server shares the backend origin (strip the trailing /api).
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const origin = apiBase.replace(/\/api\/?$/, '');

// Single shared connection for the whole app.
// `auth` is a function so the current JWT is read on every (re)connect — this
// lets the server identify the user for the live "who's online" presence panel.
// Logged-out visitors simply send no token and are counted as guests.
export const socket = io(origin, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  auth: (cb) => cb({ token: getAccessToken() || undefined }),
});

// Force the handshake to re-run with the latest token (call on login/logout so
// presence reflects the new identity without a full page reload).
export const reconnectSocket = () => {
  socket.disconnect();
  socket.connect();
};
