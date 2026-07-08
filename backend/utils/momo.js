// ─────────────────────────────────────────────────────────────────────────────
// Cameroon Mobile Money operator detection.
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
// Keep this table in sync with its client counterpart in frontend/src/utils/momo.js.

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

// Route a set of candidate numbers to their operators. Each candidate is
// { number, label } where `label` ('mtn'|'orange'|null) is the field the number
// was typed into. The prefix wins when it's recognizable; the label is only used
// for unrecognizable numbers. The first number to claim an operator keeps it, so
// pass the more trustworthy sources first. Returns { mtn, orange } (null when
// unclaimed) — never both pointing at the same number.
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
