import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { Button, Card, Skeleton } from '../components/ui';

const formatPrice = (n) =>
  `FCFA ${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;

function Cart() {
  const navigate = useNavigate();
  const { items, cartTotal, removeFromCart, loading } = useCart();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-48 h-9" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <Card className="p-10 text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary">
          <ShoppingBag className="w-6 h-6" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold text-fg">Votre panier est vide</h2>
        <p className="mt-2 text-sm text-muted">
          Parcourez les événements et ajoutez des billets pour réserver en un clin d’œil.
        </p>
        <Button variant="primary" size="lg" to="/" className="mt-7">
          Découvrir les événements
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-primary">Réservation</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
          Mon panier
        </h1>
        <p className="mt-2 text-sm text-muted">
          Vérifiez votre sélection avant de passer au paiement.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-wider uppercase text-primary">
                    {item.event.category}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-fg">
                    <Link to={`/event/${item.event_id}`} className="transition-colors hover:text-primary">
                      {item.event.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {item.event.venue} ·{' '}
                    {new Date(item.event.start_date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted">
                      {item.quantity} billet{item.quantity > 1 ? 's' : ''}
                    </p>
                    <p className="font-display font-bold text-fg tabular-nums">
                      {formatPrice(item.event.ticket_price * item.quantity)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.event_id)}
                    aria-label={`Retirer ${item.event.title} du panier`}
                    className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium transition-colors border rounded-full border-border text-muted hover:border-danger hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                    Retirer
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <aside>
          <Card className="p-6 lg:sticky lg:top-24">
            <p className="text-xs font-bold tracking-wider uppercase text-subtle">Récapitulatif</p>
            <div className="flex items-center justify-between mt-5">
              <span className="text-sm text-muted">Total billets</span>
              <span className="font-display text-2xl font-bold text-fg tabular-nums">
                {formatPrice(cartTotal)}
              </span>
            </div>
            <div className="flex items-start gap-3 p-4 mt-5 border rounded-xl border-border bg-bg">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-success" />
              <p className="text-xs leading-relaxed text-muted">
                Paiement sécurisé par Mobile Money. Vos billets QR sont délivrés dès la
                confirmation du paiement.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/checkout')}
              className="w-full mt-6"
            >
              Passer au paiement
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
}

export default Cart;
