import { Link } from 'react-router-dom';
import { Clock, MapPin, Ticket, Heart, Share2 } from 'lucide-react';
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
        'inline-flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm transition',
        'bg-black/45 text-white hover:bg-black/65 hover:scale-105',
      )}
    >
      {children}
    </button>
  );
}

const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return 'FCFA 0';
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
};

const formatTime = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
};

/* Médaillon date : jour de semaine, numéro, mois */
function DateMedallion({ iso }) {
  if (!iso) return null;
  let d;
  try {
    d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
  } catch {
    return null;
  }
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
  const day = d.toLocaleDateString('fr-FR', { day: '2-digit' });
  const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  return (
    <div className="absolute bottom-3 left-3 px-2.5 py-1.5 leading-tight text-center bg-white/95 rounded-xl shadow-elevated">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6355F5]">{weekday}</p>
      <p className="font-display text-lg font-bold text-[#12142E] -my-0.5">{day}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6355F5]">{month}</p>
    </div>
  );
}

function EventCard({ event }) {
  const remaining = Number(event?.remaining_tickets ?? 0);
  const total = Number(event?.ticket_quantity ?? 0);
  const hasTicketing = total > 0;
  const isFree = hasTicketing && Number(event?.ticket_price ?? 0) <= 0;
  const isSoldOut = total > 0 && remaining <= 0;
  const isLow = !isSoldOut && total > 0 && remaining / total <= 0.15;
  const soldRatio = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(event.id);
  const time = formatTime(event.start_date);
  const organizer = event.organization_name || event.organizer;

  return (
    <Card
      as="article"
      className="flex flex-col overflow-hidden group transition duration-300 hover:-translate-y-1.5 hover:shadow-elevated hover:border-primary/40"
    >
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
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#090D20]/70 to-transparent" />

          <div className="absolute flex items-center gap-2 top-3 left-3">
            <Badge variant="primary" size="sm" className="backdrop-blur-sm bg-[#090D20]/55 text-white border-white/25">
              {event.category || 'Événement'}
            </Badge>
            {isSoldOut ? (
              <Badge variant="rose" size="sm" className="bg-rose text-white border-transparent">Complet</Badge>
            ) : isLow ? (
              <Badge variant="warning" size="sm" className="bg-warning text-[#341B00] border-transparent">
                {remaining} restant{remaining > 1 ? 's' : ''}
              </Badge>
            ) : isFree ? (
              <Badge variant="success" size="sm" className="text-white bg-success border-transparent">Gratuit</Badge>
            ) : null}
          </div>

          <div className="absolute flex items-center gap-2 top-3 right-3">
            <CardAction label="Partager sur WhatsApp" onClick={() => shareEventWhatsApp(event)}>
              <Share2 className="w-4 h-4" />
            </CardAction>
            <CardAction
              label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              active={fav}
              onClick={() => toggle(event.id)}
            >
              <Heart className={cn('w-4 h-4 transition-colors', fav && 'fill-rose text-rose')} />
            </CardAction>
          </div>

          <DateMedallion iso={event.start_date} />
        </div>
      </Link>

      <div className="flex flex-col flex-1 gap-3 p-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-snug font-display text-fg line-clamp-2">
            <Link to={`/event/${event.id}`} className="transition-colors hover:text-primary">
              {event.title}
            </Link>
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {time ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-subtle" />
                {time}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-subtle" />
              <span className="truncate">{event.city || '—'}</span>
            </span>
          </div>
        </div>

        {organizer ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-grad-brand text-white text-[9px] font-bold">
              {String(organizer).trim()[0]?.toUpperCase() || '?'}
            </span>
            Par <span className="font-semibold text-fg">{organizer}</span>
          </p>
        ) : null}

        {/* Jauge de places restantes */}
        {hasTicketing ? (
          <div
            className="h-1 overflow-hidden rounded-full bg-surface-hover"
            role="img"
            aria-label={isSoldOut ? 'Complet' : `${remaining} places restantes sur ${total}`}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isSoldOut ? 'bg-rose' : isLow ? 'bg-warning' : 'bg-success',
              )}
              style={{ width: `${Math.round((isSoldOut ? 1 : soldRatio) * 100)}%` }}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-subtle">
              {hasTicketing ? 'À partir de' : 'Accès'}
            </p>
            <p className="font-display text-base font-bold text-fg tabular-nums">
              {!hasTicketing ? 'Entrée libre' : isFree ? 'Gratuit' : formatPrice(event.ticket_price)}
            </p>
          </div>
          {isSoldOut ? (
            <span className="inline-flex items-center h-9 px-4 text-sm font-semibold rounded-full bg-surface-hover text-subtle">
              Complet
            </span>
          ) : (
            <Link
              to={`/event/${event.id}`}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-sm font-bold rounded-full bg-grad-brand text-white shadow-glow hover:brightness-110 transition"
            >
              <Ticket className="w-4 h-4" />
              Réserver
            </Link>
          )}
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
        <div className="w-3/4 h-4 rounded skeleton" />
        <div className="w-full h-3 rounded skeleton" />
        <div className="w-2/3 h-3 rounded skeleton" />
        <div className="flex justify-between pt-3 border-t border-border">
          <div className="w-20 h-8 rounded skeleton" />
          <div className="w-24 h-8 rounded skeleton" />
        </div>
      </div>
    </Card>
  );
}

export default EventCard;
