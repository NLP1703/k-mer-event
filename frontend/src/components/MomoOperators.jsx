import { resolveMomoFromPayment } from '../utils/momo.js';

// Mobile Money operator picker. Cameroon has two networks — MTN MoMo and
// Orange Money — and an organizer may hold a different number on each. Each
// number is routed to the operator its prefix belongs to, so an organizer who
// gave a single number gets a single button (the matching network), and two
// numbers get one button each. We never show both buttons for the same number.
// Tapping a button opens the phone dialer (tel:) pre-filled with that operator's
// number so the buyer sends the transfer on the matching network.

// Strip spaces/formatting so the dialer receives a clean number (keep a leading +).
const dialable = (raw) => String(raw || '').replace(/[^\d+]/g, '');

const OPERATORS = [
  {
    key: 'mtn',
    label: 'MTN MoMo',
    // MTN yellow — kept as an explicit brand accent, readable in both themes.
    className: 'bg-[#FFCC00] text-black hover:brightness-95',
  },
  {
    key: 'orange',
    label: 'Orange Money',
    className: 'bg-[#FF6600] text-white hover:brightness-95',
  },
];

function MomoOperators({ payment, amount }) {
  // Resolve each operator's number by prefix. A lone number resolves to exactly
  // one operator, so only that operator's button renders.
  const numbers = resolveMomoFromPayment(payment);
  const available = OPERATORS.filter((op) => numbers[op.key]);

  if (!available.length) {
    return (
      <p className="text-sm text-danger">
        L’organisateur n’a pas encore renseigné de numéro Mobile Money. Contactez-le directement
        pour régler votre billet.
      </p>
    );
  }

  const amountLabel = amount != null ? `FCFA ${(Number(amount) || 0).toFixed(0)}` : null;

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-subtle">
        Choisissez votre opérateur
        {payment?.organizer_name ? ` · ${payment.organizer_name}` : ''}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {available.map((op) => {
          const number = numbers[op.key];
          return (
            <div key={op.key} className="p-4 border rounded-2xl border-border bg-bg-elevated">
              <p className="text-sm font-semibold text-fg">{op.label}</p>
              <p className="mt-1 font-mono text-base font-semibold select-all text-fg break-all">
                {number}
              </p>
              <a
                href={`tel:${dialable(number)}`}
                className={`mt-3 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-bold transition ${op.className}`}
              >
                📞 Payer avec {op.label}
              </a>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-subtle">
        Le clavier de votre téléphone s’ouvre avec le numéro. Composez le code Mobile Money de
        l’opérateur choisi pour envoyer{amountLabel ? ` ${amountLabel}` : ' le montant'}.
      </p>
    </div>
  );
}

export default MomoOperators;
