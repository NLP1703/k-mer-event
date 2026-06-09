import { io } from 'socket.io-client';

// The Socket.IO server shares the backend origin (strip the trailing /api).
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const origin = apiBase.replace(/\/api\/?$/, '');

// Single shared connection for the whole app.
export const socket = io(origin, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
});
