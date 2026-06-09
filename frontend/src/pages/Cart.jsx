import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext.jsx';

function Cart() {
  const navigate = useNavigate();
  const { items, cartTotal, removeFromCart, loading } = useCart();

  if (loading) {
    return <p className="text-muted">Loading your cart...</p>;
  }

  if (!items.length) {
    return (
      <div className="glass-card rounded-[36px] border border-border p-10 text-center">
        <h2 className="text-3xl font-semibold text-fg">Your cart is empty</h2>
        <p className="mt-4 text-muted">Browse events and add tickets to checkout faster.</p>
        <Link to="/" className="mt-8 inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover">
          Discover events
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <section className="glass-card rounded-[36px] border border-border p-8">
        <h1 className="text-4xl font-semibold text-fg">Shopping cart</h1>
        <p className="mt-3 text-muted">Review your ticket selection before checkout.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card rounded-3xl border border-border p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-primary">{item.event.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-fg">{item.event.title}</h2>
                  <p className="mt-2 text-sm text-muted">{item.event.venue} • {new Date(item.event.start_date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-muted">
                  <span>Qty: {item.quantity}</span>
                  <span>FCFA {(item.event.ticket_price * item.quantity).toFixed(0)}</span>


                  <button className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-primary hover:text-primary" onClick={() => removeFromCart(item.event_id)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="glass-card rounded-[36px] border border-border p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-primary">Summary</p>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-muted">
              <span>Ticket total</span>
              <span>FCFA {cartTotal.toFixed(0)}</span>

            </div>
            <div className="rounded-3xl border border-border bg-surface p-5">
              <p className="text-sm text-muted">Safe checkout and instant QR ticket delivery after payment simulation.</p>
            </div>
          </div>
          <button className="mt-8 w-full rounded-full bg-primary px-6 py-4 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover" onClick={() => navigate('/checkout')}>
            Continue to checkout
          </button>
        </aside>
      </div>
    </motion.div>
  );
}

export default Cart;
