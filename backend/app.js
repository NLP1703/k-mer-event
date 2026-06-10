import express from 'express';
import cors from 'cors';
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
import { errorHandler } from './middlewares/errorHandler.js';


dotenv.config();


const app = express();

// Allow cross-origin loading of resources (e.g. uploaded images served from
// /uploads consumed by the frontend on a different port/origin in dev).
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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

const corsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl, server-to-server) send no Origin header.
    if (!origin || allowedOrigins.includes(origin) || isLocalhost(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
  ],
  credentials: false,
};

// Important: handle OPTIONS requests early so routers/auth don't block preflight
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));


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






app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'K-MER Event Booking API' }));

app.use(errorHandler);

export default app;
