import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, CheckCheck, CreditCard, TicketCheck, TicketX, Info } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';
import { cn } from '../lib/cn.js';

// Pick an icon + accent for a notification based on its type.
const VISUALS = {
  payment_received: { Icon: CreditCard, tone: 'text-violet bg-violet/10' },
  ticket_confirmed: { Icon: TicketCheck, tone: 'text-success bg-success/10' },
  ticket_rejected: { Icon: TicketX, tone: 'text-danger bg-danger/10' },
  info: { Icon: Info, tone: 'text-primary bg-primary/10' },
};

// Where a notification links to when clicked.
const targetFor = (n) => {
  if (n.type === 'payment_received') return '/admin/events';
  if (n.type === 'ticket_confirmed' || n.type === 'ticket_rejected') return '/bookings';
  return null;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
};

function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleClick = (n) => {
    if (!n.read_at) markRead(n.id);
    const to = targetFor(n);
    setOpen(false);
    if (to) navigate(to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        aria-expanded={open}
        className="relative inline-flex items-center justify-center rounded-lg w-9 h-9 text-muted hover:text-fg hover:bg-surface-hover transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose text-white text-[10px] font-bold inline-flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden border rounded-2xl border-border bg-bg-elevated shadow-elevated"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-fg">Notifications</p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout marquer comme lu
                </button>
              ) : null}
            </div>

            <div className="max-h-[min(70vh,420px)] overflow-y-auto">
              {!notifications.length ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="w-8 h-8 mx-auto text-subtle" />
                  <p className="mt-3 text-sm text-muted">Aucune notification pour le moment.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => {
                    const { Icon, tone } = VISUALS[n.type] || VISUALS.info;
                    const isUnread = !n.read_at;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClick(n)}
                          className={cn(
                            'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover',
                            isUnread && 'bg-primary/[0.04]',
                          )}
                        >
                          <span className={cn('inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg', tone)}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate text-fg">{n.title}</span>
                              {isUnread ? (
                                <span className="w-2 h-2 rounded-full shrink-0 bg-primary" aria-hidden="true" />
                              ) : null}
                            </span>
                            {n.body ? (
                              <span className="block mt-0.5 text-xs leading-relaxed text-muted line-clamp-3">
                                {n.body}
                              </span>
                            ) : null}
                            <span className="block mt-1 text-[11px] text-subtle">{timeAgo(n.createdAt)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
