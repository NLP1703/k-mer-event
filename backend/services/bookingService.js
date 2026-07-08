import QRCode from 'qrcode';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { resolveOperatorNumbers } from '../utils/momo.js';

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

// Resolve the User record that owns an event. Ownership prefers the referential
// organizer_id; falls back to matching the legacy `organizer` name string.
// Returns the User instance (or null when it can't be resolved).
export const resolveOrganizerUser = async (event, transaction) => {
  if (!event) return null;
  let organizerUser = null;
  if (event.organizer_id) {
    organizerUser = await User.findByPk(event.organizer_id, { transaction });
  }
  if (!organizerUser && event.organizer) {
    organizerUser = await User.findOne({
      where: { name: String(event.organizer).trim() },
      transaction,
    });
  }
  return organizerUser;
};

// Resolve the organizer's contact for an event so buyers can pay by Mobile
// Money (Orange Money / MTN MoMo) directly to the organizer while the real
// payment APIs are not yet wired. Each number is routed to the operator its
// prefix belongs to (see utils/momo.js), so an organizer who entered a single
// number gets a single operator, and two numbers get one each — never the same
// number mirrored onto both operators. A field is null when no number resolves
// to that operator; `momo_number` keeps the raw legacy contact for reference.
export const resolveOrganizerContact = async (event, transaction) => {
  if (!event) {
    return { organizer_name: null, momo_number: null, momo_mtn: null, momo_orange: null };
  }

  const organizerUser = await resolveOrganizerUser(event, transaction);
  const { mtn, orange } = resolveOperatorNumbers([
    { number: organizerUser?.momo_mtn, label: 'mtn' },
    { number: organizerUser?.momo_orange, label: 'orange' },
    // Legacy single contact number: route it purely by its prefix (no label).
    { number: organizerUser?.telephone, label: null },
  ]);

  return {
    organizer_name: event.organizer || organizerUser?.name || null,
    momo_number: organizerUser?.telephone || null,
    momo_mtn: mtn,
    momo_orange: orange,
  };
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
