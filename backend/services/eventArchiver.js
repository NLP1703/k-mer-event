import { Op, fn } from 'sequelize';
import { Event } from '../models/Event.js';
import { emitEventsChanged } from '../config/realtime.js';

// ─────────────────────────────────────────────────────────────────────────────
// Automatic archival of past events.
// ─────────────────────────────────────────────────────────────────────────────
// Once an event's date has passed, it should vanish from the public platform —
// but we must NOT hard-delete it: the organizer keeps it in their statistics /
// history (see organizerStatisticsController). So instead of DELETE we stamp
// `archived_at`. The public event listing filters out archived rows, while the
// organizer stats keep counting them.
//
// "Past" = the event's end_date if present, otherwise its start_date, is
// strictly before now. We archive published & pending events (drafts/cancelled
// are already hidden from the public view).

export const archivePastEvents = async () => {
  try {
    const now = new Date();

    const candidates = await Event.findAll({
      where: {
        archived_at: { [Op.is]: null },
        status: { [Op.in]: ['published', 'pending'] },
        // end_date < now  OR  (end_date IS NULL AND start_date < now)
        [Op.or]: [
          { end_date: { [Op.ne]: null, [Op.lt]: now } },
          { end_date: { [Op.is]: null }, start_date: { [Op.lt]: now } },
        ],
      },
    });

    if (!candidates.length) return 0;

    for (const event of candidates) {
      await event.update({ archived_at: fn('NOW') });
      // Tell every connected client to drop the card — it's no longer public.
      emitEventsChanged('deleted', { id: event.id });
    }

    console.log(`🗂️  Archived ${candidates.length} past event(s).`);
    return candidates.length;
  } catch (error) {
    // Never let the scheduler crash the process; just log and move on.
    console.warn('⚠️  archivePastEvents failed:', error?.message || error);
    return 0;
  }
};

// Kick off a periodic archival sweep. Runs once immediately, then on an
// interval (default: every 15 minutes). Returns the timer so callers can clear
// it in tests.
export const startEventArchiver = (intervalMs = 15 * 60 * 1000) => {
  archivePastEvents();
  const timer = setInterval(archivePastEvents, intervalMs);
  // Don't keep the event loop alive just for this timer.
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
};
