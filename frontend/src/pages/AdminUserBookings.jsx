import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchBookingsForUserAdmin, downloadTicketPdf } from '../services/api.js';

function AdminUserBookings({ userId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);

  const canRender = useMemo(() => Boolean(userId), [userId]);

  useEffect(() => {
    const run = async () => {
      if (!userId) return;
      setLoading(true);
      setError('');
      try {
        const data = await fetchBookingsForUserAdmin(userId);
        setUser(data.user || null);
        setBookings(data.bookings || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Unable to load user bookings');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId]);

  const handleDownload = async (booking) => {
    const pdfData = await downloadTicketPdf(booking.id);
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${booking.booking_number}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!canRender) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card rounded-[36px] border border-border p-8 text-muted">No user selected.</div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card rounded-[36px] border border-border p-8 text-muted">Loading bookings...</div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card rounded-[36px] border border-border p-8 text-danger">{error}</div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="glass-card rounded-[36px] border border-border p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-fg">Bookings utilisateur</h1>
            <p className="mt-2 text-muted">
              {user?.name} · {user?.email}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-3 text-fg border rounded-full border-border hover:border-border-strong"
            >
              Retour
            </button>
          </div>
        </div>
      </div>

      <section className="glass-card rounded-[36px] border border-border p-8">
        <h2 className="text-2xl font-semibold text-fg">Liste des bookings</h2>

        {bookings.length === 0 ? (
          <p className="mt-4 text-muted">Aucun booking trouvé pour cet utilisateur.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="py-3 pr-6">Événement</th>
                  <th className="py-3 pr-6">Date</th>
                  <th className="py-3 pr-6">Quantité</th>
                  <th className="py-3 pr-6">Total</th>
                  <th className="py-3 pr-6">Statut</th>
                  <th className="py-3 pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="text-sm border-t border-border text-muted">
                    <td className="py-3 pr-6">
                      <div className="font-semibold text-fg">{b.event?.title}</div>
                      <div className="text-xs text-muted">{b.event?.venue}</div>
                    </td>
                    <td className="py-3 pr-6">
                      {b.event?.start_date ? new Date(b.event.start_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 pr-6">{b.quantity}</td>
                    <td className="py-3 pr-6">${Number(b.total_price || 0).toFixed(2)}</td>
                    <td className="py-3 pr-6">{b.status}</td>
                    <td className="py-3 pr-6">
                      <button
                        type="button"
                        onClick={() => handleDownload(b)}
                        className="px-5 py-2 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover"
                      >
                        Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default AdminUserBookings;

