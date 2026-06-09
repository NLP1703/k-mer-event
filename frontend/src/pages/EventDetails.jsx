import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  User as UserIcon,
  Ticket,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Heart,
  Share2,
  BellPlus,
} from 'lucide-react';
import { fetchEvent, joinWaitlist } from '../services/api.js';
import { socket } from '../lib/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { Button, Card, Badge, Skeleton } from '../components/ui';
import { eventImage, PLACEHOLDER_IMG } from '../lib/img.js';
import { useFavorites } from '../lib/favorites.js';
import { shareEventWhatsApp } from '../lib/share.js';
import { cn } from '../lib/cn.js';
import EventLocationMap from '../components/EventLocationMap.jsx';
import { Navigation } from 'lucide-react';

const normalizePhotoUrls = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      // fallthrough
    }
  }
  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
};

const isPlayableVideoUrl = (url) => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.length > 1000) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  return trimmed.startsWith('/') || lower.startsWith('http://') || lower.startsWith('https://');
};

const guessVideoMime = (url) => {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.ogv') || lower.endsWith('.ogg')) return 'video/ogg';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
};

const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return 'FCFA 0';
  return `FCFA ${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;
};

function EventDetailsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[420px] w-full rounded-3xl" />
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isFavorite, toggle } = useFavorites();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' | 'error'
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [waitlistState, setWaitlistState] = useState('idle'); // idle | joining | joined

  // `silent` refreshes (focus/poll) update the event in place, without resetting
  // the loading state, gallery selection, or the user's quantity choice.
  const loadEvent = useCallback(
    async ({ silent } = {}) => {
      if (!silent) {
        setLoading(true);
        setLoadError('');
        setVideoFailed(false);
        setActiveImage(0);
      }
      try {
        const data = await fetchEvent(id);
        setEvent(data.event);
      } catch (err) {
        console.error(err);
        if (!silent) setLoadError(err?.response?.data?.message || 'Impossible de charger l’événement');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Auto-refresh so an organizer's edits appear for other users without a manual
  // reload: on tab focus/visibility and via a light poll.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadEvent({ silent: true });
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const intervalId = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(intervalId);
    };
  }, [loadEvent]);

  // Real-time: when THIS event changes, refresh it immediately (WebSocket).
  useEffect(() => {
    const onChange = (payload) => {
      if (!payload?.eventId || String(payload.eventId) === String(id)) {
        if (payload?.type === 'deleted') {
          setLoadError('Cet événement a été supprimé.');
        } else {
          loadEvent({ silent: true });
        }
      }
    };
    socket.on('events:changed', onChange);
    return () => socket.off('events:changed', onChange);
  }, [loadEvent, id]);

  const photoUrls = useMemo(() => normalizePhotoUrls(event?.photo_urls), [event]);
  const allImages = useMemo(() => {
    const base = [event?.banner_url, ...photoUrls].filter(Boolean).map((u) => eventImage(u));
    return base.length ? base : [PLACEHOLDER_IMG];
  }, [event, photoUrls]);

  const showVideo = !!event && isPlayableVideoUrl(event.video_url) && !videoFailed;
  const remaining = Number(event?.remaining_tickets ?? 0);
  const isSoldOut = remaining <= 0;
  const eventLat = Number(event?.latitude);
  const eventLng = Number(event?.longitude);
  const hasCoords =
    Number.isFinite(eventLat) && Number.isFinite(eventLng) && !(eventLat === 0 && eventLng === 0);

  const totalPrice = Number(event?.ticket_price ?? 0) * quantity;

  const handleAddToCart = async () => {
    setMessage('');
    if (!user) {
      navigate('/login', { state: { returnTo: `/event/${id}` } });
      return;
    }
    try {
      setSubmitting(true);
      await addToCart(event.id, quantity);
      setMessageType('success');
      setMessage(`${quantity} billet${quantity > 1 ? 's' : ''} ajouté${quantity > 1 ? 's' : ''} au panier`);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Impossible d’ajouter au panier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setMessage('');
    if (!user) {
      navigate('/login', { state: { returnTo: `/event/${id}` } });
      return;
    }
    try {
      setWaitlistState('joining');
      await joinWaitlist({ eventId: event.id, quantity });
      setWaitlistState('joined');
      setMessageType('success');
      setMessage('Vous êtes sur la liste d’attente. Nous vous préviendrons par e-mail dès qu’une place se libère.');
    } catch (error) {
      setWaitlistState('idle');
      setMessageType('error');
      setMessage(error?.response?.data?.message || 'Impossible de rejoindre la liste d’attente');
    }
  };

  if (loading) return <EventDetailsSkeleton />;

  if (loadError) {
    return (
      <Card className="p-10 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-danger" />
        <p className="mt-4 text-fg">{loadError}</p>
        <Button variant="secondary" size="md" to="/" className="mt-6">
          <ArrowLeft className="w-4 h-4" />
          Retour à l’accueil
        </Button>
      </Card>
    );
  }

  if (!event) {
    return (
      <Card className="p-10 text-center">
        <p className="text-fg">Événement introuvable.</p>
      </Card>
    );
  }

  const mainImage = allImages[activeImage] || PLACEHOLDER_IMG;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link to="/" className="hover:text-fg">Accueil</Link>
        <span className="text-subtle">/</span>
        <span className="text-fg truncate">{event.title}</span>
      </div>

      {/* Hero media */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden border rounded-3xl border-border bg-bg-elevated"
      >
        <div className="relative">
          {showVideo ? (
            <video
              controls
              width="100%"
              preload="metadata"
              poster={mainImage}
              className="h-[420px] w-full object-cover bg-black"
              onError={() => setVideoFailed(true)}
            >
              <source src={event.video_url} type={guessVideoMime(event.video_url)} />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          ) : (
            <img
              src={mainImage}
              alt={event.title}
              className="h-[420px] w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER_IMG;
              }}
            />
          )}

          {!showVideo ? (
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{event.category}</Badge>
                {isSoldOut ? <Badge variant="danger">Complet</Badge> : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-white md:text-4xl">{event.title}</h1>
            </div>
          ) : null}
        </div>

        {/* Gallery thumbnails */}
        {allImages.length > 1 && !showVideo ? (
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 md:grid-cols-6">
            {allImages.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Voir image ${index + 1}`}
                aria-pressed={activeImage === index}
                className={`relative overflow-hidden rounded-lg aspect-[4/3] transition ${
                  activeImage === index
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-elevated'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img src={url} alt="" className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        ) : null}
      </motion.section>

      {/* Content + booking sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Left column: content */}
        <div className="space-y-8">
          {showVideo ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{event.category}</Badge>
              {isSoldOut ? <Badge variant="danger">Complet</Badge> : null}
              <h1 className="w-full mt-2 text-3xl font-semibold tracking-tight text-fg md:text-4xl">
                {event.title}
              </h1>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <CalendarDays className="w-4 h-4 text-primary" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-subtle">Date</p>
              <p className="mt-1 text-sm font-medium text-fg">
                {new Date(event.start_date).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </Card>
            <Card className="p-4">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-subtle">Lieu</p>
              <p className="mt-1 text-sm font-medium text-fg truncate" title={`${event.venue} · ${event.city}`}>
                {event.venue}
              </p>
              <p className="text-xs text-muted">{event.city}</p>
            </Card>
            <Card className="p-4">
              <UserIcon className="w-4 h-4 text-primary" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-subtle">Organisateur</p>
              <p className="mt-1 text-sm font-medium text-fg truncate">{event.organizer}</p>
            </Card>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-fg">À propos de l’événement</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">
              {event.description}
            </p>
          </section>

          {hasCoords ? (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-fg">Localisation</h2>
                  <p className="mt-1 text-sm text-muted">
                    {event.venue} · {event.city}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 h-10 text-sm font-medium transition-colors border rounded-full border-border text-fg hover:bg-surface-hover"
                >
                  <Navigation className="w-4 h-4" />
                  Itinéraire GPS
                </a>
              </div>
              <div className="mt-3">
                <EventLocationMap
                  latitude={event.latitude}
                  longitude={event.longitude}
                  title={event.title}
                />
              </div>
              <p className="mt-2 text-xs text-subtle">Vue satellite · OpenStreetMap / Esri</p>
            </section>
          ) : null}
        </div>

        {/* Right column: sticky booking card */}
        <aside>
          <div className="lg:sticky lg:top-24">
            <Card className="p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-subtle">Prix unitaire</p>
                  <p className="text-3xl font-semibold text-fg">{formatPrice(event.ticket_price)}</p>
                </div>
                {isSoldOut ? (
                  <Badge variant="danger">Complet</Badge>
                ) : (
                  <Badge variant="success">
                    {remaining} dispo{remaining > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <label className="text-xs font-medium uppercase tracking-wide text-muted">
                  Quantité
                </label>
                <div className="flex items-center justify-between p-1 border rounded-full border-border bg-bg">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isSoldOut}
                    aria-label="Diminuer la quantité"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-fg hover:bg-surface-hover disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-lg font-semibold text-center text-fg">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(remaining || 1, q + 1))}
                    disabled={quantity >= remaining || isSoldOut}
                    aria-label="Augmenter la quantité"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-fg hover:bg-surface-hover disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 mt-5 border-t border-border">
                <span className="text-sm text-muted">Total</span>
                <span className="text-xl font-semibold text-fg">{formatPrice(totalPrice)}</span>
              </div>

              {isSoldOut ? (
                <Button
                  variant={waitlistState === 'joined' ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={handleJoinWaitlist}
                  disabled={waitlistState === 'joining' || waitlistState === 'joined'}
                  className="w-full mt-6"
                >
                  {waitlistState === 'joined' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Inscrit sur la liste d’attente
                    </>
                  ) : waitlistState === 'joining' ? (
                    'Inscription...'
                  ) : (
                    <>
                      <BellPlus className="w-4 h-4" />
                      Rejoindre la liste d’attente
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={submitting}
                  className="w-full mt-6"
                >
                  {submitting ? (
                    'Ajout...'
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Ajouter au panier
                    </>
                  )}
                </Button>
              )}

              {isSoldOut ? (
                <p className="mt-3 text-xs text-center text-subtle">
                  Événement complet — soyez prévenu(e) par e-mail dès qu’une place se libère.
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => toggle(event.id)}
                  aria-pressed={isFavorite(event.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 h-10 text-sm font-medium transition-colors border rounded-full border-border text-fg hover:bg-surface-hover"
                >
                  <Heart className={cn('w-4 h-4', isFavorite(event.id) && 'fill-warm text-warm')} />
                  {isFavorite(event.id) ? 'Favori' : 'Favori'}
                </button>
                <button
                  type="button"
                  onClick={() => shareEventWhatsApp(event)}
                  className="inline-flex items-center justify-center gap-2 px-4 h-10 text-sm font-medium transition-colors border rounded-full border-border text-fg hover:bg-surface-hover"
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </button>
              </div>

              {message ? (
                <p
                  className={`mt-4 text-sm flex items-start gap-2 ${
                    messageType === 'success' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {messageType === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{message}</span>
                </p>
              ) : null}

              <p className="mt-4 text-xs text-subtle">
                Paiement sécurisé · Billet QR envoyé après confirmation
              </p>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default EventDetails;
