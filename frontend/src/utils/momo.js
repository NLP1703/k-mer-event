// ─────────────────────────────────────────────────────────────────────────────
// Cameroon Mobile Money operator detection (client copy).
// ─────────────────────────────────────────────────────────────────────────────
// A Cameroonian mobile number belongs to exactly one network, decided by its
// prefix, and Mobile Money follows the SIM: an MTN number can only receive MTN
// MoMo, an Orange number only Orange Money. So the number itself tells us which
// operator a buyer must pay on — the separate field label is only a fallback.
//
// National numbers are 9 digits starting with 6. Current prefix allocation:
//   MTN    : 67x, 650–654, 680–684
//   Orange : 69x, 655–659, 685–689
//   (66x Nexttel, 62x Camtel — no Mobile Money we support, so → null)
// Keep this table in sync with its server counterpart in backend/utils/momo.js.

// Returns 'mtn' | 'orange' | null for a raw phone string (any formatting).
export const detectMomoOperator = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  // Drop an international / country-code prefix, keep the 9-digit national part.
  const national = digits.replace(/^(?:00)?237/, '');
  if (!/^6\d{8}$/.test(national)) return null; // not a recognizable CM mobile
  const two = national.slice(0, 2);
  const three = Number(national.slice(0, 3));
  if (two === '67' || (three >= 650 && three <= 654) || (three >= 680 && three <= 684)) return 'mtn';
  if (two === '69' || (three >= 655 && three <= 659) || (three >= 685 && three <= 689)) return 'orange';
  return null;
};

// Route candidate numbers to their operators. Each candidate is { number, label }
// where `label` ('mtn'|'orange'|null) is the field it was typed into. The prefix
// wins when recognizable; the label is only used for unrecognizable numbers. The
// first number to claim an operator keeps it. Returns { mtn, orange } with null
// for any unclaimed operator — so a lone number yields exactly one operator.
export const resolveOperatorNumbers = (candidates = []) => {
  const result = { mtn: null, orange: null };
  for (const cand of candidates) {
    const number = cand?.number;
    if (!number) continue;
    const op = detectMomoOperator(number) || cand.label || null;
    if ((op === 'mtn' || op === 'orange') && !result[op]) {
      result[op] = number;
    }
  }
  return result;
};

// Convenience for the payment payload returned by the API (booking.payment).
export const resolveMomoFromPayment = (payment) =>
  resolveOperatorNumbers([
    { number: payment?.momo_mtn, label: 'mtn' },
    { number: payment?.momo_orange, label: 'orange' },
    // Legacy generic contact number: route it purely by its prefix.
    { number: payment?.momo_number, label: null },
  ]);
