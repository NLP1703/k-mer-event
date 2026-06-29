import { validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { Cart } from '../models/Cart.js';
import { sequelize } from '../config/db.js';
import { Op } from 'sequelize';
import { sendBookingConfirmation } from '../services/emailService.js';
import { createBookingNumber, createQrCodeForBooking, deductStock } from '../services/bookingService.js';

export const createBooking = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(422).json({ errors: errors.array() });
    }

    const { eventId, quantity } = req.body;
    const event = await Event.findByPk(eventId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!event) {
      await t.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.remaining_tickets < quantity) {
      await t.rollback();
      return res.status(400).json({ message: 'Not enough tickets available' });
    }

    const total_price = Number(event.ticket_price) * quantity;
    const booking_number = createBookingNumber();
    const qr_code_url = await createQrCodeForBooking(booking_number, event.title, req.user.id);

    // Important: no stock deduction on booking creation (pending)
    const booking = await Booking.create(
      {
        booking_number,
        user_id: req.user.id,
        event_id: event.id,
        quantity,
        total_price,
        qr_code_url,
        status: 'pending',
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ booking });
  } catch (error) {
    try {
      await t.rollback();
    } catch (e) {
      // ignore
    }
    next(error);
  }
};

export const checkoutCart = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const cartItems = await Cart.findAll({ where: { user_id: req.user.id }, include: ['event'], transaction: t, lock: t.LOCK.UPDATE });
    if (!cartItems.length) {
      await t.rollback();
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    // Validate stock availability under transaction lock, but do NOT deduct yet (pending)
    for (const item of cartItems) {
      const event = item.event;
      if (!event) {
        await t.rollback();
        return res.status(404).json({ message: 'Event was not found for a cart item' });
      }
      if (event.remaining_tickets < item.quantity) {
        await t.rollback();
        return res.status(400).json({ message: `Not enough tickets for ${event.title}` });
      }
    }

    const bookings = [];
    for (const item of cartItems) {
      const event = item.event;
      const booking_number = createBookingNumber();
      const qr_code_url = await createQrCodeForBooking(booking_number, event.title, req.user.id);

      // Deduct stock immediately during checkout (atomic, shared service).
      const ok = await deductStock(event.id, item.quantity, t);
      if (!ok) {
        await t.rollback();
        return res.status(409).json({ message: `Not enough tickets available for ${event.title}` });
      }

      const booking = await Booking.create(
        {
          booking_number,
          user_id: req.user.id,
          event_id: event.id,
          quantity: item.quantity,
          total_price: Number(event.ticket_price) * item.quantity,
          qr_code_url,
          status: 'confirmed',
          customer_name: req.body.name || req.user.name,
          customer_email: req.body.email || req.user.email,
          customer_phone: req.body.phone || '',
        },
        { transaction: t }
      );

      bookings.push(booking);
    }

    await Cart.destroy({ where: { user_id: req.user.id }, transaction: t });


    await t.commit();
    res.status(201).json({ bookings });
  } catch (error) {
    try {
      await t.rollback();
    } catch (e) {
      // ignore
    }
    next(error);
  }
};

const getPdfImageBuffer = (dataUrl) => {
  const [, base64] = dataUrl.split(',');
  return Buffer.from(base64, 'base64');
};

export const downloadTicketPdf = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ where: { id: req.params.id, user_id: req.user.id }, include: ['event'] });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Block download for expired tickets (event start date in the past)
    // or cancelled bookings. Pending bookings can also be downloaded only after
    // confirmation, but we keep the current behavior of allowing pending.
    if (booking.status === 'cancelled') {
      return res.status(403).json({ message: 'Ticket annulé, téléchargement impossible' });
    }
    const eventStart = booking.event?.start_date ? new Date(booking.event.start_date) : null;
    if (eventStart && Number.isFinite(eventStart.getTime()) && eventStart.getTime() < Date.now()) {
      return res.status(403).json({ message: 'Billet expiré, téléchargement impossible' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${booking.booking_number}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fillColor('#00ffd5').fontSize(26).text('K-MER Event Ticket', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#ffffff').fontSize(16).text(`Booking number: ${booking.booking_number}`);
    doc.text(`Event: ${booking.event.title}`);
    doc.text(`Venue: ${booking.event.venue}`);
    doc.text(`Date: ${new Date(booking.event.start_date).toLocaleString()}`);
    doc.text(`Quantity: ${booking.quantity}`);
    doc.text(`Total: $${booking.total_price.toFixed(2)}`);
    doc.text(`Attendee: ${booking.customer_name || req.user.name}`);
    doc.moveDown(1);
    doc.text('Present this ticket at the gate or on your device.', { align: 'left' });

    const qrBuffer = getPdfImageBuffer(booking.qr_code_url);
    doc.image(qrBuffer, { fit: [180, 180], align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#ffffff').fontSize(10).text('Generated by K-MER event booking system', { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// Compute the effective ticket status for a booking:
// - cancelled     => booking.status === 'cancelled'
// - expired       => event.start_date is strictly in the past
// - active        => otherwise (confirmed/pending and event in the future)
const computeTicketStatus = (booking) => {
  if (!booking) return 'unknown';
  if (booking.status === 'cancelled') return 'cancelled';
  const startRaw = booking.event?.start_date;
  if (!startRaw) return 'active';
  const start = new Date(startRaw);
  if (!Number.isFinite(start.getTime())) return 'active';
  return start.getTime() < Date.now() ? 'expired' : 'active';
};

const decorateBooking = (booking) => {
  const plain = booking.get ? booking.get({ plain: true }) : booking;
  return { ...plain, ticket_status: computeTicketStatus(plain) };
};

export const getBookingsForUser = async (req, res, next) => {
  try {
    const { status } = req.query; // optional filter: active | expired | cancelled
    const bookings = await Booking.findAll({
      where: { user_id: req.user.id },
      include: ['event'],
      order: [['createdAt', 'DESC']],
    });

    const decorated = bookings.map(decorateBooking);

    let filtered = decorated;
    if (status === 'active' || status === 'expired' || status === 'cancelled') {
      filtered = decorated.filter((b) => b.ticket_status === status);
    }

    res.json({ bookings: filtered });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ where: { id: req.params.id, user_id: req.user.id }, include: ['event'] });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ booking: decorateBooking(booking) });
  } catch (error) {
    next(error);
  }
};

// Extract a booking number from a scanned QR (JSON payload) or raw text input.
const parseTicketCode = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      return String(obj.booking_number || '').trim();
    } catch {
      // not JSON; fall through and treat as a plain code
    }
  }
  return s;
};

const serializeForCheckin = (b) => ({
  id: b.id,
  booking_number: b.booking_number,
  quantity: b.quantity,
  status: b.status,
  checked_in_at: b.checked_in_at,
  customer_name: b.customer_name,
  event: b.event ? { id: b.event.id, title: b.event.title, start_date: b.event.start_date } : null,
  user: b.user ? { name: b.user.name, email: b.user.email } : null,
});

// POST /api/bookings/checkin — validate a ticket at the entrance.
// Body: { code } where code is a booking_number or the raw QR JSON payload.
export const checkInBooking = async (req, res, next) => {
  const code = parseTicketCode(req.body?.code);
  if (!code) return res.status(400).json({ status: 'invalid', message: 'Code de billet manquant' });

  // Transactional with a row lock so two simultaneous scans of the same ticket
  // cannot both succeed: the first claims the row (SELECT ... FOR UPDATE), the
  // second blocks until commit then sees checked_in_at already set.
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findOne({
      where: { booking_number: code },
      include: [
        { model: Event, as: 'event' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!booking) {
      await t.rollback();
      return res.status(404).json({ status: 'invalid', message: 'Billet introuvable' });
    }

    // Organizers can only validate tickets for their own events. Prefer the
    // referential organizer_id; fall back to the legacy name match.
    if (req.user?.role === 'organizer') {
      const ownsById = booking.event?.organizer_id && booking.event.organizer_id === req.user.id;
      const owner = (req.user?.name ?? '').toString().trim();
      const evOrganizer = (booking.event?.organizer ?? '').toString().trim();
      const ownsByName = owner && owner === evOrganizer;
      if (!ownsById && !ownsByName) {
        await t.rollback();
        return res
          .status(403)
          .json({ status: 'forbidden', message: 'Ce billet ne concerne pas vos événements' });
      }
    }

    if (booking.status === 'cancelled') {
      await t.rollback();
      return res
        .status(409)
        .json({ status: 'cancelled', message: 'Billet annulé', booking: serializeForCheckin(booking) });
    }

    if (booking.checked_in_at) {
      await t.rollback();
      return res.status(409).json({
        status: 'already',
        message: 'Billet déjà validé',
        booking: serializeForCheckin(booking),
      });
    }

    booking.checked_in_at = new Date();
    await booking.save({ transaction: t });
    await t.commit();

    return res
      .status(200)
      .json({ status: 'ok', message: 'Billet validé', booking: serializeForCheckin(booking) });
  } catch (error) {
    try { await t.rollback(); } catch { /* already settled */ }
    next(error);
  }
};
