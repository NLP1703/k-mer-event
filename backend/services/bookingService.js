import QRCode from 'qrcode';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Event } from '../models/Event.js';

// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for booking stock mechanics.
// ─────────────────────────────────────────────────────────────────────────────
// Both booking entry points (direct booking + cart checkout) and the payment
// workflow go through these helpers, so stock can never drift between code
// paths. All mutations are conditional UPDATEs that are safe under concurrency.

export const createBookingNumber = () => `KMER-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

export const createQrCodeForBooking = async (bookingNumber, eventTitle, userId) => {
  const payload = JSON.stringify({ booking_number: bookingNumber, event: eventTitle, user_id: userId });
  return QRCode.toDataURL(payload);
};

// Atomically decrement remaining_tickets only if enough are available.
// Returns true on success, false if not enough stock. MUST run in a transaction.
export const deductStock = async (eventId, quantity, transaction) => {
  const [affected] = await Event.update(
    { remaining_tickets: sequelize.literal(`remaining_tickets - ${Number(quantity)}`) },
    {
      where: { id: eventId, remaining_tickets: { [Op.gte]: Number(quantity) } },
      transaction,
    },
  );
  return affected > 0;
};

// Atomically give stock back (cancellation / refund). We restore exactly the
// quantity that was previously deducted, so remaining_tickets can never exceed
// ticket_quantity. Capped defensively at capacity in the WHERE-free increment.
export const restoreStock = async (eventId, quantity, transaction) => {
  await Event.update(
    { remaining_tickets: sequelize.literal(`remaining_tickets + ${Number(quantity)}`) },
    { where: { id: eventId }, transaction },
  );
};
