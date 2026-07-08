import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Music,
  PartyPopper,
  Mic,
  Theater,
  Drum,
  Trophy,
  Heart,
  ChevronDown,
  QrCode,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { fetchEvents } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { socket } from '../lib/socket.js';
import EventCard, { EventCardSkeleton } from '../components/EventCard.jsx';
import { Button, Input, Card, Select } from '../components/ui';
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
    text: 'Mes ventes ont doublé depuis que je suis sur KMER. Le dashboard est parfait.',
  },
  {
    name: 'Lina K.',
    role: 'Spectatrice',
    text: 'L’interface est belle, je trouve tous les événements de Douala en un clic.',
  },
];

const STATS = [
  { label: 'Événements', value: '500+' },
  { label: 'Billets vendus', value: '25 000+' },
  { label: 'Villes', value: '12' },
  { label: 'Satisfaction', value: '4.8/5' },
];

const FAQ = [
  {
    q: 'Comment est-ce que je reçois mon billet ?',
    a: 'Dès que votre paiement est validé, votre billet QR apparaît dans « Mes billets ». Présentez-le simplement à l’entrée de l’événement — aucun papier nécessaire.',
  },
  {
    q: 'Comment se passe le paiement ?',
    a: 'Le paiement s’effectue par Mobile Money (Orange Money ou MTN MoMo) directement auprès de l’organisateur. Une fois la réception confirmée par l’organisateur, votre billet est émis automatiquement.',
  },
  {
    q: 'Le billet QR est-il sécurisé ?',
    a: 'Oui. Chaque billet possède un QR unique, scanné et validé à l’entrée. Un billet déjà utilisé est immédiatement détecté — impossible de le dupliquer.',
  },
  {
    q: 'Puis-je annuler ma réservation ?',
    a: 'Les conditions d’annulation dépendent de chaque événement. Contactez directement l’organisateur — ses coordonnées figurent sur la page de l’événement.',
  },
  {
    q: 'Comment devenir organisateur ?',
    a: 'Créez un compte, puis demandez le statut organisateur depuis votre profil. Vous pourrez ensuite publier vos événements, suivre vos ventes et scanner les billets à l’entrée.',
  },
];

const scrollToEvents = () =>
  document.getElementById('events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* En-tête de section : eyebrow + titre */
function SectionHead({ eyebrow, title, aside }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold font-display text-fg md:text-3xl">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

/* ============ Hero — moment électrique (bleu nuit sur les deux thèmes) ============ */
function Hero({ search, setSearch, onPickCategory }) {
  const submit = (e) => {
    e.preventDefault();
    scrollToEvents();
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#090D20] border border-[#1E2647]">
      {/* Aurores — violet / bleu électrique / cyan */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(560px 300px at 12% 0%, rgb(139 92 246 / 0.30), transparent 62%), radial-gradient(640px 340px at 88% 18%, rgb(46 124 246 / 0.26), transparent 64%), radial-gradient(500px 320px at 55% 110%, rgb(8 184 212 / 0.16), transparent 60%)',
        }}
      />

      <div className="relative px-5 py-14 text-center sm:px-10 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full border border-violet/40 bg-violet/10 text-[#C9BAFF]">
            <Sparkles className="w-3.5 h-3.5" />
            La billetterie nouvelle génération au Cameroun
          </span>

          <h1 className="max-w-2xl mx-auto mt-6 font-display font-bold tracking-tight text-display-xl text-[#F2F4FF]">
            Vivez les événements qui font{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9BAFF] via-[#8EB6FF] to-[#6EE4F5]">
              vibrer le 237
            </span>
          </h1>

          <p className="max-w-xl mx-auto mt-5 text-base md:text-lg text-[#A9B1D6]">
            Concerts, festivals, stand-up, culture. Réservez en 30 secondes,
            recevez votre billet QR instantanément.
          </p>
        </motion.div>

        {/* Recherche centrale */}
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          onSubmit={submit}
          role="search"
          className="flex items-center max-w-xl gap-2 p-1.5 pl-5 mx-auto mt-8 border rounded-full bg-white/5 border-white/15 backdrop-blur-md focus-within:border-violet/60"
        >
          <Search className="w-4 h-4 shrink-0 text-[#8B93BD]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un concert, un festival, une ville…"
            aria-label="Rechercher un événement"
            className="flex-1 min-w-0 text-sm bg-transparent border-0 outline-none text-[#F2F4FF] placeholder:text-[#8B93BD]"
          />
          <button
            type="submit"
            className="h-10 px-5 text-sm font-bold text-white transition rounded-full shrink-0 bg-grad-brand shadow-glow hover:brightness-110"
          >
            Rechercher
          </button>
        </motion.form>

        {/* Chips catégories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-6"
        >
          {CATEGORIES.map(({ label }) => (
            <button
              key={label}
              type="button"
              onClick={() => onPickCategory(label)}
              className="px-4 py-1.5 text-[13px] font-semibold rounded-full border border-white/15 text-[#C6CCEF] bg-white/[0.04] hover:border-primary hover:text-white hover:bg-primary/15 transition-colors"
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="flex flex-wrap items-start justify-center max-w-2xl mx-auto mt-12 border-t gap-x-10 gap-y-5 border-white/10 pt-7"
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <dd className="font-display text-2xl font-bold text-[#F2F4FF] tabular-nums">{s.value}</dd>
              <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#8B93BD]">
                {s.label}
              </dt>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

/* ============ Catégories — bandeau auto-défilant cliquable ============ */
function Categories({ active, onPick }) {
  // La liste est rendue deux fois : la piste `marquee-track` translate de -50%
  // (une copie exacte) en boucle, donc le défilement horizontal est continu et
  // sans couture. Survol / focus = pause pour cliquer confortablement; la copie
  // est masquée aux lecteurs d'écran et au clavier.
  const renderCard = ({ label, icon: Icon }, clone) => {
    const isActive = active === label;
    return (
      <button
        key={clone ? `${label}-clone` : label}
        type="button"
        role={clone ? undefined : 'listitem'}
        aria-hidden={clone || undefined}
        tabIndex={clone ? -1 : undefined}
        onClick={() => onPick(isActive ? '' : label)}
        aria-pressed={clone ? undefined : isActive}
        className={cn(
          'shrink-0 w-32 sm:w-36 p-4 text-center transition rounded-2xl border shadow-card',
          isActive
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-surface hover:border-primary/50 hover:-translate-y-0.5',
        )}
      >
        <Icon className={cn('w-5 h-5 mx-auto', isActive ? 'text-primary' : 'text-muted')} />
        <p className={cn('mt-2 text-sm font-semibold', isActive ? 'text-primary' : 'text-fg')}>
          {label}
        </p>
      </button>
    );
  };

  return (
    <section id="categories" className="space-y-5">
      <SectionHead eyebrow="Explorer" title="Catégories populaires" />
      <div
        className="overflow-hidden py-1 -my-1"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        }}
      >
        <div className="marquee-track flex w-max gap-3 pr-3" role="list">
          {CATEGORIES.map((c) => renderCard(c, false))}
          {CATEGORIES.map((c) => renderCard(c, true))}
        </div>
      </div>
    </section>
  );
}

/* ============ Pourquoi KMER — grille statique ============ */
function ValueProps() {
  return (
    <section className="space-y-5">
      <SectionHead eyebrow="Pourquoi KMER" title="Une expérience pensée pour vous" />
      <div className="grid gap-4 md:grid-cols-3">
        {VALUE_PROPS.map(({ icon: Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card className="h-full p-6">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-fg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ============ Devenir organisateur ============ */
function OrganizerCta({ user }) {
  const perks = [
    { icon: QrCode, text: 'Billetterie QR et contrôle d’accès intégrés' },
    { icon: TrendingUp, text: 'Statistiques de ventes en temps réel' },
    { icon: Smartphone, text: 'Paiement Mobile Money, sans terminal' },
  ];
  return (
    <section className="relative overflow-hidden border rounded-3xl border-border bg-bg-elevated">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{
          background:
            'radial-gradient(480px 260px at 90% 10%, rgb(var(--color-violet) / 0.14), transparent 60%)',
        }}
      />
      <div className="relative grid items-center gap-8 p-8 md:p-12 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-wider uppercase text-primary">Organisateurs</p>
          <h2 className="text-2xl font-semibold font-display text-fg md:text-3xl">
            Vous organisez des événements ?<br />
            <span className="text-grad-brand">Vendez vos billets sur KMER.</span>
          </h2>
          <p className="max-w-lg text-sm leading-relaxed md:text-base text-muted">
            Publiez votre événement en quelques minutes, suivez vos réservations en direct
            et scannez les billets à l’entrée — le tout depuis votre téléphone.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="primary" size="lg" to={user ? '/profile' : '/register'}>
              Devenir organisateur
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <ul className="space-y-3">
          {perks.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 p-4 border rounded-2xl border-border bg-surface"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary">
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="text-sm font-medium text-fg">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ============ Témoignages ============ */
function Testimonials() {
  return (
    <section className="space-y-5">
      <SectionHead eyebrow="Ils nous font confiance" title="Ce qu’ils en disent" />
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card className="h-full p-6">
              <p className="text-sm leading-relaxed text-fg">« {t.text} »</p>
              <div className="flex items-center gap-3 mt-5">
                <span className="inline-flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full bg-grad-brand">
                  {t.name[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ============ FAQ ============ */
function Faq() {
  return (
    <section className="space-y-5">
      <SectionHead eyebrow="Questions fréquentes" title="Tout ce qu’il faut savoir" />
      <div className="max-w-3xl space-y-3">
        {FAQ.map(({ q, a }) => (
          <details
            key={q}
            className="border group rounded-2xl border-border bg-surface open:border-primary/40 open:shadow-card"
          >
            <summary className="flex items-center justify-between gap-4 px-5 py-4 text-sm font-semibold list-none cursor-pointer select-none text-fg [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown className="w-4 h-4 transition-transform shrink-0 text-subtle group-open:rotate-180 group-open:text-primary" />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ============ CTA final ============ */
function CallToAction() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#090D20] border border-[#1E2647]">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(520px 280px at 30% 50%, rgb(139 92 246 / 0.22), transparent 55%), radial-gradient(520px 280px at 70% 50%, rgb(46 124 246 / 0.18), transparent 55%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-6 p-10 text-center md:p-16">
        <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-[#F2F4FF] md:text-4xl">
          Prêt à vivre votre prochain événement ?
        </h2>
        <p className="max-w-xl text-base text-[#A9B1D6]">
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
            as="button"
            onClick={scrollToEvents}
            className={!user ? 'border-white/20 bg-white/5 text-white hover:border-white/50 hover:text-white' : ''}
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
  const { user } = useAuth();
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

  // Depuis le hero ou la grille de catégories : filtre + scroll vers la liste.
  const pickCategory = (label) => {
    setCategoryFilter(label);
    scrollToEvents();
  };

  const toggleChip = (active) =>
    cn(
      'inline-flex items-center gap-1.5 px-3 h-9 text-sm rounded-full border transition-colors',
      active
        ? 'border-primary text-primary bg-primary/10 font-semibold'
        : 'border-border text-muted hover:text-fg hover:border-border-strong',
    );

  return (
    <div className="space-y-16 md:space-y-24">
      <Hero search={search} setSearch={setSearch} onPickCategory={pickCategory} />

      <Categories active={categoryFilter} onPick={(label) => setCategoryFilter(label)} />

      {/* Events */}
      <section id="events" className="space-y-6 scroll-mt-24">
        <SectionHead
          eyebrow="À l’affiche"
          title="Événements populaires"
          aside={
            <p className="hidden text-sm sm:block text-muted">
              {filtered.length} événement{filtered.length > 1 ? 's' : ''}
            </p>
          }
        />

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
                <Heart className={cn('w-3.5 h-3.5', favOnly && 'fill-rose text-rose')} />
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
          <SectionHead eyebrow="Prochainement" title="À venir" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}

      <ValueProps />
      <OrganizerCta user={user} />
      <Testimonials />
      <Faq />
      <CallToAction />
    </div>
  );
}

export default Home;
