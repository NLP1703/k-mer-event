import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext.jsx';

function Cart() {
  const navigate = useNavigate();
  const { items, cartTotal, removeFromCart, loading } = useCart();

  if (loading) {
    return <p className="text-white/70">Loading your cart...</p>;
  }

  if (!items.length) {
    return (
      <div className="glass-card rounded-[36px] border border-white/10 p-10 text-center">
        <h2 className="text-3xl font-semibold text-white">Your cart is empty</h2>
        <p className="mt-4 text-white/70">Browse events and add tickets to checkout faster.</p>
        <Link to="/" className="mt-8 inline-flex rounded-full bg-neon px-8 py-3 text-sm font-semibold text-night transition hover:bg-white">
          Discover events
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <section className="glass-card rounded-[36px] border border-white/10 p-8">
        <h1 className="text-4xl font-semibold text-white">Shopping cart</h1>
        <p className="mt-3 text-white/70">Review your ticket selection before checkout.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card rounded-3xl border border-white/10 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-neon">{item.event.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{item.event.title}</h2>
                  <p className="mt-2 text-sm text-white/70">{item.event.venue} • {new Date(item.event.start_date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-white/80">
                  <span>Qty: {item.quantity}</span>
                  <span>FCFA {(item.event.ticket_price * item.quantity).toFixed(0)}</span>


                  <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-neon hover:text-neon" onClick={() => removeFromCart(item.event_id)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="glass-card rounded-[36px] border border-white/10 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-neon">Summary</p>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-white/70">
              <span>Ticket total</span>
              <span>FCFA {cartTotal.toFixed(0)}</span>

            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/70">Safe checkout and instant QR ticket delivery after payment simulation.</p>
            </div>
          </div>
          <button className="mt-8 w-full rounded-full bg-neon px-6 py-4 text-sm font-semibold text-night transition hover:bg-white" onClick={() => navigate('/checkout')}>
            Continue to checkout
          </button>
        </aside>
      </div>
    </motion.div>
  );
}

export default Cart;
