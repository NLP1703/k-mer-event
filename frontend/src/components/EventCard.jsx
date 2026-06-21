import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket, Heart, Share2 } from 'lucide-react';
import { Card, Badge } from './ui';
import { eventImage, PLACEHOLDER_IMG } from '../lib/img.js';
import { useFavorites } from '../lib/favorites.js';
import { shareEventWhatsApp } from '../lib/share.js';
import { cn } from '../lib/cn.js';

function CardAction({ onClick, label, active, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm transition-colors',
        'bg-black/40 text-white hover:bg-black/60',
      )}
    >
      {children}
    </button>
  );
}

const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return 'FCFA 0';
  return `FCFA ${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

function EventCard({ event }) {
  const remaining = Number(event?.remaining_tickets ?? 0);
  const total = Number(event?.ticket_quantity ?? 0);
  const hasTicketing = total > 0;
  const isFree = hasTicketing && Number(event?.ticket_price ?? 0) <= 0;
  const isSoldOut = total > 0 && remaining <= 0;
  const isLow = !isSoldOut && total > 0 && remaining / total <= 0.15;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(event.id);

  return (
    <Card as="article" interactive className="overflow-hidden group flex flex-col">
      <Link to={`/event/${event.id}`} className="block focus-visible:outline-none" aria-label={event.title}>
        <div className="relative overflow-hidden aspect-[16/10] bg-surface-hover">
          <img
            src={eventImage(event.banner_url)}
            alt={event.title}
            loading="lazy"
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_IMG;
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute flex items-center gap-2 top-3 left-3">
            <Badge variant="primary" size="sm">{event.category || 'Événement'}</Badge>
            {isSoldOut ? (
              <Badge variant="danger" size="sm">Complet</Badge>
            ) : isLow ? (
              <Badge variant="warning" size="sm">{remaining} restant{remaining > 1 ? 's' : ''}</Badge>
            ) : null}
          </div>
          <div className="absolute flex items-center gap-2 top-3 right-3">
            <CardAction label="Partager sur WhatsApp" onClick={() => shareEventWhatsApp(event)}>
              <Share2 className="w-4 h-4" />
            </CardAction>
            <CardAction label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} active={fav} onClick={() => toggle(event.id)}>
              <Heart className={cn('w-4 h-4', fav && 'fill-warm text-warm')} />
            </CardAction>
          </div>
        </div>
      </Link>

      <div className="flex flex-col flex-1 gap-3 p-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-snug text-fg line-clamp-2">
            <Link to={`/event/${event.id}`} className="hover:text-primary transition-colors">
              {event.title}
            </Link>
          </h3>
          <p className="text-sm text-muted line-clamp-2">{event.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-subtle" />
            {formatDate(event.start_date)}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-subtle" />
            <span className="truncate">{event.city || '—'}</span>
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-subtle">
              {hasTicketing ? 'À partir de' : 'Accès'}
            </p>
            <p className="text-base font-semibold text-fg">
              {!hasTicketing ? 'Entrée libre' : isFree ? 'Gratuit' : formatPrice(event.ticket_price)}
            </p>
          </div>
          <Link
            to={`/event/${event.id}`}
            className="inline-flex items-center gap-1.5 px-4 h-9 text-sm font-medium rounded-full bg-primary text-primary-fg hover:bg-primary-hover transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Détails
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/10] skeleton rounded-none" />
      <div className="p-5 space-y-3">
        <div className="h-4 rounded skeleton w-3/4" />
        <div className="h-3 rounded skeleton w-full" />
        <div className="h-3 rounded skeleton w-2/3" />
        <div className="flex justify-between pt-3 border-t border-border">
          <div className="h-8 rounded skeleton w-20" />
          <div className="h-8 rounded skeleton w-24" />
        </div>
      </div>
    </Card>
  );
}

export default EventCard;
