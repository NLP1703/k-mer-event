import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ImageUploader from '../components/ImageUploader.jsx';
import { submitPaymentProof } from '../services/api.js';

// After checkout, bookings are created as `pending`. Mobile payment APIs
// (Orange Money / MTN MoMo) are not wired yet, so the buyer pays manually by
// sending the amount to the organizer's phone number. This screen shows the
// number and amount, and opens the phone dialer via a `tel:` link. The
// organizer confirms receipt afterwards, which validates the ticket.

// Strip spaces/formatting so the dialer receives a clean number. Keep a leading
// "+" for international prefixes.
const dialable = (raw) => String(raw || '').replace(/[^\d+]/g, '');

function PaymentInstructions() {
  const location = useLocation();
  const bookings = (location.state?.bookings || []).filter((b) => b.payment?.required);

  // Per-booking proof state: { urls: string[], status: 'idle'|'saving'|'saved'|'error', message }.
  // The screenshot is NOT sent on upload: the buyer uploads it, then clicks
  // "Valider le paiement" to submit it (which is blocked unless exactly one file).
  const [proofs, setProofs] = useState({});

  // Uploader changed — hold the file(s) locally, do not submit yet.
  const handleUpload = (bookingId, urls) => {
    setProofs((prev) => ({
      ...prev,
      [bookingId]: { urls: Array.isArray(urls) ? urls.filter(Boolean) : [], status: 'idle' },
    }));
  };

  // Explicit validation: submit the single screenshot as the payment proof.
  const handleValidate = async (bookingId) => {
    const urls = proofs[bookingId]?.urls || [];
    if (urls.length !== 1) return; // guarded by the disabled button
    setProofs((prev) => ({ ...prev, [bookingId]: { urls, status: 'saving' } }));
    try {
      await submitPaymentProof(bookingId, urls[0]);
      setProofs((prev) => ({ ...prev, [bookingId]: { urls, status: 'saved' } }));
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

  if (!bookings.length) {
    return (
      <div className="bg-surface shadow-card rounded-2xl border border-border p-10 text-center">
        <h1 className="text-3xl font-semibold text-fg">Aucun paiement en attente</h1>
        <p className="mt-4 text-muted">
          Retrouvez vos billets et leur statut dans vos réservations.
        </p>
        <Link
          to="/bookings"
          className="mt-8 inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover"
        >
          Mes réservations
        </Link>
      </div>
    );
  }

  const total = bookings.reduce((sum, b) => sum + (Number(b.payment?.amount) || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <section className="bg-surface shadow-card rounded-2xl border border-border p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-primary">Paiement Mobile Money</p>
        <h1 className="mt-3 text-3xl font-semibold text-fg">Finalisez votre paiement</h1>
        <p className="mt-4 text-muted">
          Envoyez le montant indiqué par <strong className="text-fg">Orange Money</strong> ou{' '}
          <strong className="text-fg">MTN MoMo</strong> au numéro de l’organisateur ci-dessous.
          Votre billet sera validé dès que l’organisateur confirme la réception du paiement.
        </p>
      </section>

      <div className="space-y-4">
        {bookings.map((booking) => {
          const number = booking.payment?.momo_number;
          const clean = dialable(number);
          const proof = proofs[booking.id] || { urls: [], status: 'idle' };
          const fileCount = proof.urls?.length || 0;
          const canValidate = fileCount === 1 && proof.status !== 'saving' && proof.status !== 'saved';
          return (
            <div key={booking.id} className="bg-surface shadow-card rounded-2xl border border-border p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-fg">
                    {booking.event?.title || 'Événement'}
                  </h2>
                  <p className="mt-1 text-xs font-mono text-subtle">{booking.booking_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-subtle">Montant</p>
                  <p className="text-2xl font-semibold text-fg">
                    FCFA {(Number(booking.payment?.amount) || 0).toFixed(0)}
                  </p>
                </div>
              </div>

              {number ? (
                <div className="mt-5 rounded-3xl border border-border bg-surface p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-subtle">
                    Numéro de l’organisateur
                    {booking.payment?.organizer_name ? ` · ${booking.payment.organizer_name}` : ''}
                  </p>
                  <p className="mt-2 select-all font-mono text-xl font-semibold text-fg">{number}</p>
                  <a
                    href={`tel:${clean}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover sm:w-auto"
                  >
                    📞 Ouvrir le téléphone
                  </a>
                  <p className="mt-3 text-xs text-subtle">
                    Le clavier de votre téléphone s’ouvre avec le numéro. Composez le code Mobile
                    Money de votre opérateur pour envoyer FCFA{' '}
                    {(Number(booking.payment?.amount) || 0).toFixed(0)}.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-border bg-surface p-5">
                  <p className="text-sm text-danger">
                    L’organisateur n’a pas encore renseigné de numéro Mobile Money. Contactez-le
                    directement pour régler votre billet.
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-3xl border border-border bg-surface p-5">
                <p className="text-sm font-semibold text-fg">Preuve de paiement</p>
                <p className="mt-1 text-xs text-subtle">
                  Après le transfert, ajoutez <strong className="text-fg">une seule</strong> capture
                  d’écran de la confirmation Mobile Money (avec le numéro et le montant), puis validez
                  votre paiement. L’organisateur la vérifie avant de confirmer votre billet.
                </p>
                <div className="mt-4">
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
                      className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
          );
        })}
      </div>

      <section className="bg-surface shadow-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between text-fg">
          <span className="text-sm text-muted">Total à payer</span>
          <span className="text-xl font-semibold">FCFA {total.toFixed(0)}</span>
        </div>
        <Link
          to="/bookings"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-fg transition hover:border-primary"
        >
          J’ai payé · voir mes réservations
        </Link>
        <p className="mt-3 text-center text-xs text-subtle">
          Le statut passera de « en attente » à « confirmé » après validation par l’organisateur.
        </p>
      </section>
    </motion.div>
  );
}

export default PaymentInstructions;
