import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchBookings, downloadTicketPdf } from '../services/api.js';

const isExpired = (booking) => {
  if (booking?.ticket_status === 'expired') return true;
  const start = booking?.event?.start_date ? new Date(booking.event.start_date) : null;
  if (!start || !Number.isFinite(start.getTime())) return false;
  return start.getTime() < Date.now();
};

const isCancelled = (booking) =>
  booking?.ticket_status === 'cancelled' || booking?.status === 'cancelled';

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('active'); // 'active' | 'expired'
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    fetchBookings()
      .then((data) => {
        setBookings(data.bookings || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const { activeBookings, expiredBookings } = useMemo(() => {
    const active = [];
    const expired = [];
    for (const b of bookings) {
      if (isCancelled(b)) continue; // hide cancelled from the regular tabs
      if (isExpired(b)) expired.push(b);
      else active.push(b);
    }
    return { activeBookings: active, expiredBookings: expired };
  }, [bookings]);

  const handleDownload = async (booking) => {
    setDownloadError('');
    try {
      const pdfData = await downloadTicketPdf(booking.id);
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${booking.booking_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Try to parse JSON message from blob response
      let message = 'Téléchargement impossible';
      try {
        const blob = err?.response?.data;
        if (blob instanceof Blob) {
          const text = await blob.text();
          const json = JSON.parse(text);
          message = json?.message || message;
        } else if (err?.response?.data?.message) {
          message = err.response.data.message;
        }
      } catch {
        // ignore parse error, use default message
      }
      setDownloadError(message);
    }
  };

  if (loading) {
    return <p className="text-white/70">Chargement des billets...</p>;
  }

  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  const currentList = tab === 'active' ? activeBookings : expiredBookings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-4xl font-semibold text-white">Mes billets</h1>
        <div className="inline-flex p-1 border rounded-full border-white/10 bg-black/30">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
              tab === 'active'
                ? 'bg-neon text-night'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Actifs ({activeBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('expired')}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
              tab === 'expired'
                ? 'bg-neon text-night'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Expirés ({expiredBookings.length})
          </button>
        </div>
      </div>

      {downloadError ? (
        <p className="text-sm text-rose-400">{downloadError}</p>
      ) : null}

      {!currentList.length ? (
        <p className="text-white/70">
          {tab === 'active'
            ? 'Aucun billet actif pour le moment.'
            : 'Aucun billet expiré dans votre historique.'}
        </p>
      ) : (
        <div className="grid gap-6">
          {currentList.map((booking) => {
            const expired = isExpired(booking);
            return (
              <div
                key={booking.id}
                className={`glass-card rounded-3xl border p-6 ${
                  expired ? 'border-white/10 opacity-80' : 'border-white/10'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white">{booking.event?.title}</h2>
                      {expired ? (
                        <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-rose-500/20 text-rose-300">
                          Expiré
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-emerald-500/20 text-emerald-300">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-white/70">
                      {booking.event?.venue} · {booking.event?.start_date
                        ? new Date(booking.event.start_date).toLocaleDateString()
                        : '—'}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Quantité : {booking.quantity}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-white/70">Référence : {booking.booking_number}</p>
                    {expired ? (
                      <p className="text-xs text-rose-300">
                        Téléchargement indisponible — événement passé.
                      </p>
                    ) : (
                      <button
                        onClick={() => handleDownload(booking)}
                        className="px-5 py-3 text-sm font-semibold transition rounded-full bg-neon text-night hover:bg-white"
                      >
                        Télécharger le billet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default Bookings;
