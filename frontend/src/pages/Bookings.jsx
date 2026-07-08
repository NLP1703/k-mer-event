import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BellRing, MapPin, X } from 'lucide-react';
import {
  fetchBookings,
  downloadTicketPdf,
  fetchMyWaitlist,
  leaveWaitlist,
  submitPaymentProof,
} from '../services/api.js';
import ImageUploader from '../components/ImageUploader.jsx';
import MomoOperators from '../components/MomoOperators.jsx';

const isPending = (booking) => booking?.status === 'pending';

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
  const [waitlist, setWaitlist] = useState([]);
  // Per-booking proof state: { urls: string[], status, message }. The screenshot
  // is submitted only when the buyer clicks "Valider le paiement", and only when
  // exactly one file is present.
  const [proofs, setProofs] = useState({});

  const handleUpload = (bookingId, urls) => {
    setProofs((prev) => ({
      ...prev,
      [bookingId]: { urls: Array.isArray(urls) ? urls.filter(Boolean) : [], status: 'idle' },
    }));
  };

  const handleValidate = async (bookingId) => {
    const urls = proofs[bookingId]?.urls || [];
    if (urls.length !== 1) return; // guarded by the disabled button
    setProofs((prev) => ({ ...prev, [bookingId]: { urls, status: 'saving' } }));
    try {
      await submitPaymentProof(bookingId, urls[0]);
      setProofs((prev) => ({ ...prev, [bookingId]: { urls, status: 'saved' } }));
      // Reflect the saved proof on the booking so it survives a tab switch.
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, payment_proof_url: urls[0] } : b)),
      );
    } catch (err) {
      setProofs((prev) => ({
        ...prev,
        [bookingId]: {
          urls,
          status: 'error',
          message: err.response?.data?.message || 'Échec de la validation. Réessayez.',
        },
      }));
    }
  };

  useEffect(() => {
    fetchBookings()
      .then((data) => {
        setBookings(data.bookings || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load bookings'))
      .finally(() => setLoading(false));

    fetchMyWaitlist()
      .then((data) => setWaitlist(data.waitlist || []))
      .catch(() => {
        /* non-blocking: the waitlist section just stays empty */
      });
  }, []);

  const handleLeaveWaitlist = async (id) => {
    try {
      await leaveWaitlist(id);
      setWaitlist((prev) => prev.filter((entry) => entry.id !== id));
    } catch {
      /* best-effort */
    }
  };

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
    return <p className="text-muted">Chargement des billets...</p>;
  }

  if (error) {
    return <p className="text-danger">{error}</p>;
  }

  const currentList = tab === 'active' ? activeBookings : expiredBookings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">Mes billets</h1>
        <div className="inline-flex p-1 border rounded-full border-border bg-bg-elevated">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
              tab === 'active'
                ? 'bg-primary text-primary-fg'
                : 'text-muted hover:text-fg'
            }`}
          >
            Actifs ({activeBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('expired')}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
              tab === 'expired'
                ? 'bg-primary text-primary-fg'
                : 'text-muted hover:text-fg'
            }`}
          >
            Expirés ({expiredBookings.length})
          </button>
        </div>
      </div>

      {downloadError ? (
        <p className="text-sm text-danger">{downloadError}</p>
      ) : null}

      {!currentList.length ? (
        <p className="text-muted">
          {tab === 'active'
            ? 'Aucun billet actif pour le moment.'
            : 'Aucun billet expiré dans votre historique.'}
        </p>
      ) : (
        <div className="grid gap-6">
          {currentList.map((booking) => {
            const expired = isExpired(booking);
            const pending = isPending(booking);
            const proof = proofs[booking.id] || {
              urls: booking.payment_proof_url ? [booking.payment_proof_url] : [],
              status: booking.payment_proof_url ? 'saved' : 'idle',
            };
            const fileCount = proof.urls?.length || 0;
            const canValidate = fileCount === 1 && proof.status !== 'saving' && proof.status !== 'saved';
            return (
              <div
                key={booking.id}
                className={`bg-surface shadow-card rounded-2xl border p-6 ${
                  expired ? 'border-border opacity-80' : 'border-border'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold text-fg">{booking.event?.title}</h2>
                      {expired ? (
                        <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-danger/15 text-danger">
                          Expiré
                        </span>
                      ) : pending ? (
                        <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-warm/15 text-warm">
                          Paiement en attente
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-success/15 text-success">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {booking.event?.venue} · {booking.event?.start_date
                        ? new Date(booking.event.start_date).toLocaleDateString()
                        : '—'}
                    </p>
                    <p className="mt-1 text-xs text-subtle">
                      Quantité : {booking.quantity}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-muted">Référence : {booking.booking_number}</p>
                    {pending && !expired ? (
                      <p className="text-xs text-warm">
                        Validé après confirmation du paiement par l’organisateur.
                      </p>
                    ) : (
                      <button
                        onClick={() => handleDownload(booking)}
                        className="px-5 py-3 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover"
                      >
                        Télécharger le billet
                      </button>
                    )}
                  </div>
                </div>

                {pending ? (
                  <div className="p-5 mt-5 space-y-4 border rounded-3xl border-border bg-surface">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-fg">Finaliser le paiement Mobile Money</p>
                      {booking.payment?.amount != null ? (
                        <p className="text-lg font-semibold text-fg">
                          FCFA {(Number(booking.payment.amount) || 0).toFixed(0)}
                        </p>
                      ) : null}
                    </div>

                    <MomoOperators payment={booking.payment} amount={booking.payment?.amount} />

                    <div>
                      <p className="text-sm font-medium text-fg">Preuve de paiement (capture d’écran)</p>
                      <p className="mt-1 text-xs text-subtle">
                        Ajoutez <strong className="text-fg">une seule</strong> capture de votre
                        transfert (numéro + montant), puis validez votre paiement. L’organisateur la
                        vérifie avant de confirmer votre billet.
                      </p>
                      <div className="mt-3">
                        <ImageUploader
                          multiple
                          value={proof.urls}
                          onChange={(urls) => handleUpload(booking.id, urls)}
                        />
                      </div>

                      {proof.status === 'saved' ? (
                        <p className="mt-3 text-sm text-emerald-500">
                          ✓ Paiement validé. En attente de confirmation par l’organisateur.
                        </p>
                      ) : (
                        <>
                          {fileCount > 1 ? (
                            <p className="mt-3 text-xs text-danger">
                              Une seule capture est autorisée. Retirez-en {fileCount - 1} pour pouvoir valider.
                            </p>
                          ) : fileCount === 0 ? (
                            <p className="mt-3 text-xs text-subtle">
                              Ajoutez votre capture pour pouvoir valider le paiement.
                            </p>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleValidate(booking.id)}
                            disabled={!canValidate}
                            className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {proof.status === 'saving' ? 'Validation…' : 'Valider le paiement'}
                          </button>

                          {proof.status === 'error' ? (
                            <p className="mt-2 text-xs text-danger">{proof.message}</p>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Waitlist section */}
      <section className="pt-4 mt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-warm" />
          <h2 className="text-2xl font-semibold text-fg">Mes listes d’attente</h2>
        </div>

        {!waitlist.length ? (
          <p className="mt-3 text-muted">
            Vous n’êtes inscrit(e) sur aucune liste d’attente. Sur un événement complet, vous
            pouvez demander à être prévenu(e) dès qu’une place se libère.
          </p>
        ) : (
          <div className="grid gap-4 mt-4">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 p-5 border rounded-3xl border-border bg-surface sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-fg">
                      {entry.event?.title || 'Événement'}
                    </h3>
                    {entry.status === 'notified' ? (
                      <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-success/15 text-success">
                        Place disponible
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold uppercase rounded-full bg-warm/15 text-warm">
                        En attente
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 mt-1 text-sm text-muted">
                    <MapPin className="w-3.5 h-3.5" />
                    {entry.event?.venue || '—'} · {entry.event?.start_date
                      ? new Date(entry.event.start_date).toLocaleDateString()
                      : '—'}
                  </p>
                  <p className="mt-1 text-xs text-subtle">Places demandées : {entry.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'notified' && entry.event?.id ? (
                    <Link
                      to={`/event/${entry.event.id}`}
                      className="px-5 py-2.5 text-sm font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover"
                    >
                      Réserver
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleLeaveWaitlist(entry.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition border rounded-full border-border text-fg hover:border-danger hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                    Se retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default Bookings;
