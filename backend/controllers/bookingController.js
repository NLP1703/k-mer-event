import { validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { Cart } from '../models/Cart.js';
import { sequelize } from '../config/db.js';
import { createBookingNumber, createQrCodeForBooking, deductStock, resolveOrganizerContact, resolveOrganizerUser } from '../services/bookingService.js';
import { createNotification } from '../services/notificationService.js';
import { drawTicket } from '../services/ticketPdf.js';

// Anti-hoarding rule: a buyer may not hold more than this many tickets still
// awaiting the organizer's payment confirmation for a single event. It keeps
// pending seats (reserved but unpaid) from being locked up indefinitely.
export const MAX_PENDING_TICKETS_PER_EVENT = 3;

// Sum the quantities of a user's still-pending bookings for one event.
const pendingTicketsForEvent = async (userId, eventId, transaction) => {
  const sum = await Booking.sum('quantity', {
    where: { user_id: userId, event_id: eventId, status: 'pending' },
    transaction,
  });
  return Number(sum) || 0;
};

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

    // Anti-hoarding: block the purchase if the buyer would end up holding more
    // than MAX_PENDING_TICKETS_PER_EVENT tickets awaiting payment confirmation
    // for this same event.
    const alreadyPending = await pendingTicketsForEvent(req.user.id, event.id, t);
    if (alreadyPending + Number(quantity) > MAX_PENDING_TICKETS_PER_EVENT) {
      await t.rollback();
      return res.status(409).json({
        message: `Vous avez déjà ${alreadyPending} billet(s) en attente de confirmation pour cet événement. La limite est de ${MAX_PENDING_TICKETS_PER_EVENT} billets en attente par événement. Attendez la validation de l’organisateur avant d’en réserver d’autres.`,
      });
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

      // Anti-hoarding: paid events keep the seat pending until the organizer
      // confirms the Mobile Money transfer, so cap pending tickets per event.
      const isFree = Number(event.ticket_price) * item.quantity <= 0;
      if (!isFree) {
        const alreadyPending = await pendingTicketsForEvent(req.user.id, event.id, t);
        if (alreadyPending + Number(item.quantity) > MAX_PENDING_TICKETS_PER_EVENT) {
          await t.rollback();
          return res.status(409).json({
            message: `Vous avez déjà ${alreadyPending} billet(s) en attente de confirmation pour « ${event.title} ». La limite est de ${MAX_PENDING_TICKETS_PER_EVENT} billets en attente par événement.`,
          });
        }
      }
    }

    const bookings = [];
    for (const item of cartItems) {
      const event = item.event;
      const booking_number = createBookingNumber();
      const qr_code_url = await createQrCodeForBooking(booking_number, event.title, req.user.id);

      // Reserve stock immediately during checkout (atomic, shared service) so
      // the seat is held while the buyer completes the Mobile Money transfer.
      const ok = await deductStock(event.id, item.quantity, t);
      if (!ok) {
        await t.rollback();
        return res.status(409).json({ message: `Not enough tickets available for ${event.title}` });
      }

      // Bookings start as `pending`: mobile payment is done manually to the
      // organizer's Orange Money / MTN MoMo number, and the organizer confirms
      // receipt (which flips the booking to `confirmed`). Free events (price 0)
      // need no payment, so they are confirmed straight away.
      const total_price = Number(event.ticket_price) * item.quantity;
      const isFree = total_price <= 0;

      const booking = await Booking.create(
        {
          booking_number,
          user_id: req.user.id,
          event_id: event.id,
          quantity: item.quantity,
          total_price,
          qr_code_url,
          status: isFree ? 'confirmed' : 'pending',
          customer_name: req.body.name || req.user.name,
          customer_email: req.body.email || req.user.email,
          customer_phone: req.body.phone || '',
        },
        { transaction: t }
      );

      // Attach the organizer's Mobile Money contact so the client can be
      // redirected to the phone dialer to pay. Null momo_number => the
      // organizer has not set a phone number yet.
      const contact = isFree
        ? { organizer_name: event.organizer || null, momo_number: null }
        : await resolveOrganizerContact(event, t);

      const plain = booking.get({ plain: true });
      bookings.push({
        ...plain,
        event: { id: event.id, title: event.title },
        payment: {
          required: !isFree,
          amount: total_price,
          organizer_name: contact.organizer_name,
          momo_number: contact.momo_number,
          momo_mtn: contact.momo_mtn,
          momo_orange: contact.momo_orange,
        },
      });
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

// POST /api/bookings/:id/payment-proof — the buyer attaches a screenshot of
// their Mobile Money transfer to a pending booking. The organizer reviews it
// before confirming. Body: { url } (an /uploads/ URL produced by the uploader).
export const submitPaymentProof = async (req, res, next) => {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(422).json({ message: 'Un fichier de preuve est requis' });

    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [{ model: Event, as: 'event' }],
    });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Proof is only meaningful while payment is still pending confirmation.
    if (booking.status !== 'pending') {
      return res.status(409).json({ message: 'Cette réservation n’est plus en attente de paiement' });
    }

    booking.payment_proof_url = url;
    await booking.save();

    // Notify the organizer that a buyer has declared a payment for their event,
    // so they can review the proof and confirm the ticket. Best-effort.
    if (booking.event) {
      const organizer = await resolveOrganizerUser(booking.event);
      if (organizer?.id) {
        const amount = Number(booking.total_price) || 0;
        await createNotification({
          userId: organizer.id,
          type: 'payment_received',
          title: 'Nouveau paiement à confirmer',
          body: `${req.user.name} a envoyé un paiement de FCFA ${amount.toFixed(0)} pour « ${booking.event.title} ». Vérifiez la preuve et validez le billet.`,
          data: {
            bookingId: booking.id,
            eventId: booking.event.id,
            booking_number: booking.booking_number,
            amount,
          },
        });
      }
    }

    return res.json({ booking: { id: booking.id, payment_proof_url: booking.payment_proof_url } });
  } catch (error) {
    next(error);
  }
};

export const downloadTicketPdf = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: ['event', 'user'],
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only cancelled bookings are blocked (they are refunded / voided and must
    // not produce a valid-looking ticket). Past/expired events are allowed to
    // download so the buyer keeps a proper PDF record of every ticket, past or
    // not; pending bookings are also allowed (unchanged behavior).
    if (booking.status === 'cancelled') {
      return res.status(403).json({ message: 'Ticket annulé, téléchargement impossible' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${booking.booking_number}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(res);
    drawTicket(doc, { booking, user: req.user });
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

    // Attach Mobile Money payment info to still-pending bookings so the "Mes
    // billets" page can act as a fallback to finish payment / upload the proof.
    const decorated = await Promise.all(
      bookings.map(async (booking) => {
        const base = decorateBooking(booking);
        if (base.status === 'pending' && Number(base.total_price) > 0) {
          const contact = await resolveOrganizerContact(booking.event);
          base.payment = {
            required: true,
            amount: Number(base.total_price),
            organizer_name: contact.organizer_name,
            momo_number: contact.momo_number,
            momo_mtn: contact.momo_mtn,
            momo_orange: contact.momo_orange,
          };
        }
        return base;
      }),
    );

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

    // A pending booking has not been paid yet (the organizer has not confirmed
    // the Mobile Money transfer). Do not let it through the entrance.
    if (booking.status === 'pending') {
      await t.rollback();
      return res.status(409).json({
        status: 'pending',
        message: 'Paiement non confirmé par l’organisateur',
        booking: serializeForCheckin(booking),
      });
    }

    if (booking.checked_in_at) {
      await t.rollback();
      return res.status(409).json({
        status: 'already',
        message: 'Billet déjà validé',
        booking: serializeForCheckin(booking),
      });
    }

    // Reject tickets whose event has already started (expired) — same rule as
    // the PDF download guard. A never-used ticket for a past event is not valid.
    const eventStart = booking.event?.start_date ? new Date(booking.event.start_date) : null;
    if (eventStart && Number.isFinite(eventStart.getTime()) && eventStart.getTime() < Date.now()) {
      await t.rollback();
      return res.status(409).json({
        status: 'expired',
        message: 'Billet expiré (événement passé)',
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
