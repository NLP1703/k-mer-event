import { validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Cart } from '../models/Cart.js';
import { sequelize } from '../config/db.js';
import { Op, literal } from 'sequelize';
import { sendBookingConfirmation } from '../services/emailService.js';


const createBookingNumber = () => `KMER-${Date.now().toString().slice(-8)}`;

const createQrCodeForBooking = async (bookingNumber, eventTitle, userId) => {
  const qrPayload = JSON.stringify({ booking_number: bookingNumber, event: eventTitle, user_id: userId });
  return await QRCode.toDataURL(qrPayload);
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

      // Deduct stock immediately during checkout (atomic with transaction)
      const dec = await Event.update(
        { remaining_tickets: sequelize.literal('remaining_tickets - ' + item.quantity) },
        {
          where: {
            id: event.id,
            remaining_tickets: { [Op.gte]: item.quantity },
          },
          transaction: t,
        }
      );

      if (!dec[0]) {
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

export const getBookingsForUser = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({ where: { user_id: req.user.id }, include: ['event'] });
    res.json({ bookings });
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
    res.json({ booking });
  } catch (error) {
    next(error);
  }
};
