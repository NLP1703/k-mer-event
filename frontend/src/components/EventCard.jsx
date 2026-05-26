import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';


function EventCard({ event }) {
  return (
    <article className="p-6 overflow-hidden transition border glass-card group rounded-3xl border-white/10 shadow-glow hover:-translate-y-1 hover:shadow-2xl">
      <div className="relative overflow-hidden rounded-3xl">
        <img src={event.banner_url || '/placeholder.jpg'} alt={event.title} className="object-cover w-full h-56 transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 px-5 py-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-sm uppercase tracking-[0.25em] text-neon">{event.category}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">{event.title}</h3>
          <span className="rounded-md bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">{event.status}</span>
        </div>
        <p className="text-sm line-clamp-2 text-white/70">{event.description}</p>

        <div className="grid gap-2 text-sm text-white/65 sm:grid-cols-2">
          <span className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {new Date(event.start_date).toLocaleDateString()}</span>
          <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.city}</span>
        </div>

        <div className="flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-2 text-sm text-white/80"><Ticket className="w-4 h-4" /> FCFA {Number.isFinite(Number(event.ticket_price)) ? Number(event.ticket_price).toFixed(0) : '0'}</span>
          <Link
            to={`/event/${event.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition rounded-md bg-neon text-night hover:bg-white"
          >
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}

export default EventCard;

