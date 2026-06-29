import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import paymentsRoutes from './routes/paymentsRoutes.js';
import adminUsersRoutes from './routes/adminUsersRoutes.js';
import adminBookingsRoutes from './routes/adminBookingsRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { trackActivity } from './middlewares/trackActivity.js';


dotenv.config();


const app = express();

// Behind exactly one reverse proxy (Nginx in production, or a Cloudflare/ngrok
// tunnel when sharing the survey). Lets express read the real client IP from
// X-Forwarded-For so rate-limiting is per-respondent, not per-proxy.
app.set('trust proxy', 1);

// Resolve paths relative to this file (not the process CWD) so static dirs
// work no matter where the server is launched from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow cross-origin loading of resources (e.g. uploaded images served from
// /uploads consumed by the frontend on a different port/origin in dev).
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      // Allow the Socket.IO realtime connection (same-origin WebSocket) used by
      // the live survey dashboard, on top of the helmet defaults.
      'connect-src': ["'self'", 'ws:', 'wss:'],
    },
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS: explicitly support browser preflight requests.
// FRONTEND_URL may be a comma-separated allowlist. Any localhost/127.0.0.1
// origin is also allowed so the Vite dev server can hop ports (5173 -> 5174…).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

// Public tunnels used to share the survey (Cloudflare, ngrok, localtunnel).
// The form is served same-origin through these, so their Origin must be allowed.
const isTunnel = (origin) => {
  try {
    return /\.(trycloudflare\.com|ngrok-free\.app|ngrok\.io|loca\.lt)$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl, server-to-server) send no Origin header.
    if (!origin || allowedOrigins.includes(origin) || isLocalhost(origin) || isTunnel(origin)) {
      return callback(null, true);
    }
    // Do NOT throw for an unknown origin: that would turn every same-origin
    // POST (whose browser still sends an Origin header) into a 500. Instead
    // proceed without CORS headers — same-origin requests succeed, and genuine
    // cross-origin reads are still blocked by the browser.
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
  ],
  // Required so the browser sends/receives the HttpOnly refresh-token cookie on
  // cross-origin auth requests (dev: Vite :5173 -> API :4000).
  credentials: true,
};

// Important: handle OPTIONS requests early so routers/auth don't block preflight
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(cookieParser());


app.use(morgan('dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Never let browsers/proxies serve stale API data — edits made by an organizer
// must be visible to everyone on the next fetch (no 304 from heuristic caching).
app.use('/api/', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Record authenticated activity (throttled, best-effort) for the weekly-usage
// analytics on the admin dashboard. Never blocks or rejects a request.
app.use('/api/', trackActivity);
app.use(
  '/uploads',
  express.static('uploads', {
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }),
);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin', adminBookingsRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/survey', surveyRoutes);

// Serve the public survey form and the admin results dashboard same-origin,
// so the shareable link is simply  https://<host>/survey/  with no CORS or
// API-base configuration needed. The directory lives at repo-root/survey.
app.use('/survey', express.static(path.join(__dirname, '..', 'survey')));






app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'K-MER Event Booking API' }));

app.use(errorHandler);

export default app;
