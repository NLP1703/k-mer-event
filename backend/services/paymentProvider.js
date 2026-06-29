// ─────────────────────────────────────────────────────────────────────────────
// Payment provider abstraction.
// ─────────────────────────────────────────────────────────────────────────────
// The rest of the app talks to this interface, never to a concrete gateway.
// Today only a simulated provider exists; Stripe / PayPal / Orange Money can be
// added by implementing { charge, refund } and registering them in `providers`.
// This keeps the payment workflow (create → charge → confirm/cancel → refund)
// completely decoupled from any third party.

const simulated = {
  name: 'simulated',
  // Decide the outcome from an explicit hint (used by the demo/tests).
  async charge({ amount, hint }) {
    const ok = (hint || 'success') === 'success';
    return {
      success: ok,
      reference: `SIM-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      raw: { amount, simulated: true },
    };
  },
  async refund({ reference, amount }) {
    return { success: true, reference: `SIM-REFUND-${Date.now()}`, raw: { of: reference, amount } };
  },
};

// Real gateways would be added here, e.g.:
//   const stripe = { name: 'stripe', async charge() { /* stripe.charges.create */ } };
const providers = { simulated };

export const getPaymentProvider = (name) => providers[name] || providers.simulated;
