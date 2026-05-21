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
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();


const app = express();

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS: explicitly support browser preflight requests
const corsOptions = {
origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin', adminBookingsRoutes);



app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'K-MER Event Booking API' }));

app.use(errorHandler);

export default app;
