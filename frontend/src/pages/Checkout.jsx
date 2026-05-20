import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext.jsx';
import { checkoutCart } from '../services/api.js';

function Checkout() {
  const navigate = useNavigate();
  const { items, cartTotal, clearCart } = useCart();
  const [billing, setBilling] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!items.length) return;

    setLoading(true);
    setError('');

    try {
      const response = await checkoutCart(billing);
      await clearCart();
      navigate('/success', { state: { bookings: response.bookings } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 sm:gap-8 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-card rounded-[36px] border border-white/10 p-6 sm:p-8">

        <h1 className="text-4xl font-semibold text-white">Checkout</h1>
        <p className="mt-3 text-white/70">Complete your booking with attendee details and secure ticket generation.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <label className="block text-sm text-white/70">
            Full name
            <input
              required
              type="text"
              value={billing.name}
              onChange={(e) => setBilling({ ...billing, name: e.target.value })}
              className="mt-3 w-full rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-white"
            />
          </label>

          <label className="block text-sm text-white/70">
            Email address
            <input
              required
              type="email"
              value={billing.email}
              onChange={(e) => setBilling({ ...billing, email: e.target.value })}
              className="mt-3 w-full rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-white"
            />
          </label>

          <label className="block text-sm text-white/70">
            Phone number
            <input
              type="tel"
              value={billing.phone}
              onChange={(e) => setBilling({ ...billing, phone: e.target.value })}
              className="mt-3 w-full rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-white"
            />
          </label>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <button type="submit" disabled={loading} className="w-full rounded-full bg-neon px-6 py-4 text-sm font-semibold text-night transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Processing...' : `Pay FCFA ${cartTotal.toFixed(0)}`}
          </button>
        </form>
      </section>

      <aside className="glass-card rounded-[36px] border border-white/10 p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-neon">Order summary</p>
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <h2 className="text-lg font-semibold text-white">{item.event.title}</h2>
              <p className="mt-2 text-sm text-white/70">{item.quantity} × FCFA {item.event.ticket_price.toFixed(0)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-white/10 pt-6 text-white/80">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>FCFA {cartTotal.toFixed(0)}</span>
          </div>
          <p className="mt-4 text-sm text-white/60">Tickets will be issued as downloadable PDF with secure QR codes immediately after checkout.</p>
        </div>
      </aside>
    </motion.div>
  );
}

export default Checkout;

