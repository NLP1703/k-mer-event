import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  Ticket,
  ArrowRight,
  Music,
  PartyPopper,
  Mic,
  Theater,
  Drum,
  Trophy,
  Heart,
} from 'lucide-react';
import { fetchEvents } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { socket } from '../lib/socket.js';
import EventCard, { EventCardSkeleton } from '../components/EventCard.jsx';
import { Button, Input, Card, Badge, Select } from '../components/ui';
import { useFavorites } from '../lib/favorites.js';
import { cn } from '../lib/cn.js';

const CATEGORIES = [
  { label: 'Concert', icon: Music },
  { label: 'Festival', icon: PartyPopper },
  { label: 'Stand-up', icon: Mic },
  { label: 'Théâtre', icon: Theater },
  { label: 'Afrobeat', icon: Drum },
  { label: 'Sport', icon: Trophy },
];

const VALUE_PROPS = [
  {
    icon: Zap,
    title: 'Réservation en 30 secondes',
    text: 'Checkout fluide, paiement sécurisé, billet QR délivré immédiatement.',
  },
  {
    icon: ShieldCheck,
    title: 'Billets vérifiés',
    text: 'Chaque QR est unique et contrôlé à l’entrée. Pas de fraude, pas de stress.',
  },
  {
    icon: Sparkles,
    title: 'Événements premium',
    text: 'Sélection rigoureuse des organisateurs et des lieux les plus en vue du Cameroun.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Awa N.',
    role: 'Spectatrice',
    text: 'Réservation ultra rapide et billet reçu en quelques secondes. Bluffant.',
  },
  {
    name: 'Eric T.',
    role: 'Organisateur',
    text: 'Mes ventes ont doublé depuis que je suis sur K-MER. Le dashboard est parfait.',
  },
  {
    name: 'Lina K.',
    role: 'Spectatrice',
    text: 'L’interface est belle, je trouve tous les événements de Douala en un clic.',
  },
];

const STATS = [
  { label: 'Événements créés', value: '500+' },
  { label: 'Billets vendus', value: '25 000+' },
  { label: 'Villes couvertes', value: '12' },
  { label: 'Satisfaction', value: '4.8/5' },
];

function Hero({ search, setSearch }) {
  return (
    <section className="relative overflow-hidden border rounded-3xl border-border bg-bg-elevated">
      {/* Subtle background glows — adapt to theme */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgb(var(--color-primary) / 0.12), transparent 40%), radial-gradient(circle at 80% 80%, rgb(var(--color-accent) / 0.10), transparent 45%)',
        }}
      />

      <div className="relative grid items-center gap-10 p-6 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <Badge variant="primary" size="md">
            <Sparkles className="w-3 h-3" />
            Réservation premium au Cameroun
          </Badge>

          <h1 className="font-semibold tracking-tight text-display-xl text-fg">
            Réservez les événements qui vous ressemblent.
          </h1>

          <p className="max-w-xl text-base leading-relaxed md:text-lg text-muted">
            Concerts, festivals, soirées culturelles et expériences nocturnes.
            Trouvez vos prochaines sorties et obtenez votre billet QR en moins d’une minute.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" as="a" href="#events">
              <Ticket className="w-4 h-4" />
              Explorer les événements
            </Button>
            <Button variant="secondary" size="lg" as="a" href="#categories">
              Voir les catégories
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Inline stats */}
          <dl className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4 border-t border-border">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-xs uppercase tracking-wide text-subtle">{s.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-fg">{s.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-fg">Recherche rapide</h2>
            <p className="mt-1 text-xs text-muted">Filtrez par nom, ville ou catégorie</p>

            <div className="mt-4">
              <Input
                type="search"
                icon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un concert, un festival..."
                aria-label="Rechercher un événement"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="p-3 border rounded-xl border-border bg-surface">
                <p className="text-[10px] uppercase tracking-wide text-subtle">Ville en vogue</p>
                <p className="mt-1 text-sm font-semibold text-fg">Douala</p>
              </div>
              <div className="p-3 border rounded-xl border-border bg-surface">
                <p className="text-[10px] uppercase tracking-wide text-subtle">Catégorie populaire</p>
                <p className="mt-1 text-sm font-semibold text-fg">Afrobeat</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section id="categories" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-warm">Explorer</p>
          <h2 className="mt-1 text-2xl font-semibold text-fg md:text-3xl">Catégories</h2>
        </div>
      </div>
      <div className="overflow-hidden motion-reduce:overflow-x-auto">
        <div className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...CATEGORIES, ...CATEGORIES].map(({ label, icon: Icon }, i) => (
            <Card
              key={`${label}-${i}`}
              interactive
              aria-hidden={i >= CATEGORIES.length}
              className="p-4 text-center shrink-0 w-36"
            >
              <Icon className="w-5 h-5 mx-auto text-warm" />
              <p className="mt-2 text-sm font-medium text-fg">{label}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValueProps() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-warm">Pourquoi K-MER</p>
        <h2 className="mt-1 text-2xl font-semibold text-fg md:text-3xl">
          Une expérience pensée pour vous
        </h2>
      </div>
      <div className="overflow-hidden motion-reduce:overflow-x-auto">
        <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...VALUE_PROPS, ...VALUE_PROPS].map(({ icon: Icon, title, text }, i) => (
            <Card key={`${title}-${i}`} aria-hidden={i >= VALUE_PROPS.length} className="p-6 shrink-0 w-[300px] sm:w-[340px]">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-warm">Ils nous font confiance</p>
        <h2 className="mt-1 text-2xl font-semibold text-fg md:text-3xl">Ce qu’ils en disent</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} className="p-6">
            <p className="text-sm leading-relaxed text-fg">« {t.text} »</p>
            <div className="flex items-center gap-3 mt-5">
              <span className="inline-flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-full bg-surface-hover text-fg">
                {t.name[0]}
              </span>
              <div>
                <p className="text-sm font-medium text-fg">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CallToAction() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden border rounded-3xl border-border bg-bg-elevated">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(circle at 30% 50%, rgb(var(--color-primary) / 0.16), transparent 50%), radial-gradient(circle at 70% 50%, rgb(var(--color-accent) / 0.12), transparent 50%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-6 p-10 text-center md:p-16">
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-fg md:text-4xl">
          Prêt à vivre votre prochain événement ?
        </h2>
        <p className="max-w-xl text-base text-muted">
          {user
            ? 'Parcourez les événements et recevez vos billets en quelques clics.'
            : 'Inscrivez-vous gratuitement et recevez vos billets en quelques clics.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!user && (
            <Button variant="primary" size="lg" to="/register">
              Créer un compte
            </Button>
          )}
          <Button
            variant={user ? 'primary' : 'secondary'}
            size="lg"
            as="a"
            href="#events"
          >
            Explorer maintenant
          </Button>
        </div>
      </div>
    </section>
  );
}

const PRICE_RANGES = [
  { label: 'Tous les prix', value: '' },
  { label: '≤ 5 000 FCFA', value: '5000' },
  { label: '≤ 10 000 FCFA', value: '10000' },
  { label: '≤ 20 000 FCFA', value: '20000' },
];

function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Advanced filters (client-side refinement of the fetched list).
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const { favorites } = useFavorites();

  // `silent` refreshes (focus/poll) update the list without showing skeletons.
  const loadEvents = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await fetchEvents({ search });
        setEvents(data.events || []);
      } catch (err) {
        console.error(err);
        if (!silent) setEvents([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Auto-refresh so edits by organizers/admins appear without a manual reload:
  // on tab focus/visibility and via a light poll.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadEvents({ silent: true });
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const id = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(id);
    };
  }, [loadEvents]);

  // Real-time: refresh the list immediately when any event changes (WebSocket).
  useEffect(() => {
    const onChange = () => loadEvents({ silent: true });
    socket.on('events:changed', onChange);
    return () => socket.off('events:changed', onChange);
  }, [loadEvents]);

  const cities = useMemo(
    () => [...new Set(events.map((e) => e.city).filter(Boolean))].sort(),
    [events],
  );
  const categories = useMemo(
    () => [...new Set(events.map((e) => e.category).filter(Boolean))].sort(),
    [events],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      if (cityFilter && e.city !== cityFilter) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (maxPrice && Number(e.ticket_price) > Number(maxPrice)) return false;
      if (favOnly && !favorites.includes(String(e.id))) return false;
      if (upcomingOnly) {
        const start = e.start_date ? new Date(e.start_date).getTime() : null;
        if (!start || start < now) return false;
      }
      return true;
    });
  }, [events, cityFilter, categoryFilter, maxPrice, favOnly, upcomingOnly, favorites]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      const start = e.start_date ? new Date(e.start_date).getTime() : null;
      return start && start >= now;
    });
  }, [events]);

  const hasActiveFilters = cityFilter || categoryFilter || maxPrice || upcomingOnly || favOnly;
  const resetFilters = () => {
    setCityFilter('');
    setCategoryFilter('');
    setMaxPrice('');
    setUpcomingOnly(false);
    setFavOnly(false);
  };

  const toggleChip = (active) =>
    cn(
      'inline-flex items-center gap-1.5 px-3 h-9 text-sm rounded-full border transition-colors',
      active
        ? 'border-warm text-warm bg-warm/10 font-medium'
        : 'border-border text-muted hover:text-fg hover:border-border-strong',
    );

  return (
    <div className="space-y-16 md:space-y-20">
      <Hero search={search} setSearch={setSearch} />

      <Categories />

      {/* Events */}
      <section id="events" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-warm">À l’affiche</p>
            <h2 className="mt-1 text-2xl font-semibold text-fg md:text-3xl">
              Événements populaires
            </h2>
          </div>
          <p className="hidden text-sm sm:block text-muted">
            {filtered.length} événement{filtered.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter bar */}
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              icon={Search}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un événement…"
              className="lg:max-w-xs"
              aria-label="Rechercher"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} aria-label="Ville">
                <option value="">Toutes les villes</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Catégorie">
                <option value="">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Prix maximum">
                {PRICE_RANGES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2 lg:ml-auto">
              <button type="button" onClick={() => setUpcomingOnly((v) => !v)} className={toggleChip(upcomingOnly)}>
                À venir
              </button>
              <button type="button" onClick={() => setFavOnly((v) => !v)} className={toggleChip(favOnly)}>
                <Heart className={cn('w-3.5 h-3.5', favOnly && 'fill-warm')} />
                Favoris
              </button>
              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="text-sm underline text-muted hover:text-fg underline-offset-4">
                  Réinitialiser
                </button>
              ) : null}
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-fg">Aucun événement trouvé.</p>
            <p className="mt-1 text-sm text-muted">
              {hasActiveFilters ? 'Essayez d’élargir vos filtres.' : 'Essayez un autre mot-clé.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters} className="mt-4">
                Réinitialiser les filtres
              </Button>
            ) : null}
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-warm">Prochainement</p>
              <h2 className="mt-1 text-2xl font-semibold text-fg md:text-3xl">À venir</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}

      <ValueProps />
      <Testimonials />
      <CallToAction />
    </div>
  );
}

export default Home;
