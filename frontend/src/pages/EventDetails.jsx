import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchEvent } from '../services/api.js';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEvent(id)
      .then((data) => setEvent(data.event))
      .catch(console.error);
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await addToCart(event.id, quantity);
      setMessage('Added to cart successfully');
    } catch (error) {
      setMessage(error.message || 'Unable to add to cart');
    }
  };

  if (!event) {
    return <p className="text-white/70">Loading event details...</p>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <section className="glass-card rounded-[36px] border border-white/10 overflow-hidden">
        {(() => {
          const normalizePhotoUrls = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value.filter(Boolean);

            // If Sequelize returns TEXT, it can come as a string
            if (typeof value === 'string') {
              const trimmed = value.trim();

              // JSON array string: "["...", ...]"
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  const parsed = JSON.parse(trimmed);
                  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
                } catch {
                  // fallthrough
                }
              }

              // comma-separated string
              return value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            }

            return [];
          };

          const photoUrls = normalizePhotoUrls(event.photo_urls);
          const mainImage = photoUrls[0] || event.banner_url || '/placeholder.jpg';

          if (event.video_url) {
            return (
              <video
                controls
                className="h-[420px] w-full object-cover bg-black"
                poster={mainImage}
              >
                <source src={event.video_url} />
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            );
          }

          return (
            <img
              src={mainImage}
              alt={event.title}
              className="h-[420px] w-full object-cover"
            />
          );
        })()}
        {(() => {
          const normalizePhotoUrls = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value.filter(Boolean);
            if (typeof value === 'string') {
              const trimmed = value.trim();
              // JSON array string
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  const parsed = JSON.parse(trimmed);
                  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
                } catch {
                  // fallthrough
                }
              }
              // comma-separated string
              return value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            }
            return [];
          };

          const photoUrls = normalizePhotoUrls(event.photo_urls);
          if (photoUrls.length > 1 && !event.video_url) {
            return (
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {photoUrls.slice(1).map((photoUrl, index) => (
                  <img
                    key={index}
                    src={photoUrl}
                    alt={`${event.title} photo ${index + 2}`}
                    className="object-cover w-full h-36 rounded-3xl"
                  />
                ))}
              </div>
            );
          }
          return null;
        })()}
        <div className="p-10">
          <div className="flex flex-wrap items-center gap-4 text-sm uppercase tracking-[0.25em] text-neon">
            <span>{event.category}</span>
            <span>{new Date(event.start_date).toLocaleDateString()}</span>
            <span>{event.city}</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold text-white">{event.title}</h1>
          <p className="max-w-3xl mt-4 text-white/70">{event.description}</p>
          <div className="grid gap-4 mt-8 md:grid-cols-2">
            <div className="p-6 border rounded-3xl border-white/10 bg-black/20">
              <h2 className="text-lg font-semibold text-white">Venue</h2>
              <p className="mt-3 text-white/70">{event.venue}</p>
              <p className="mt-4 text-sm text-white/60">Organizer: {event.organizer}</p>
            </div>
            <div className="p-6 border rounded-3xl border-white/10 bg-black/20">
              <h2 className="text-lg font-semibold text-white">Ticket info</h2>
              <p className="mt-3 text-white/70">Price: FCFA {event.ticket_price.toFixed(0)}</p>
              <p className="mt-2 text-white/70">Available: {event.remaining_tickets}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 px-4 py-3 border rounded-3xl border-white/10 bg-black/20">
              <button
                type="button"
                onClick={() => setQuantity((qty) => Math.max(1, qty - 1))}
                className="px-3 py-2 transition border rounded-full border-white/10 text-white/80 hover:border-neon hover:text-neon"
              >
                -
              </button>
              <span className="w-12 text-lg text-center text-white">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((qty) => Math.min(event.remaining_tickets, qty + 1))}
                className="px-3 py-2 transition border rounded-full border-white/10 text-white/80 hover:border-neon hover:text-neon"
              >
                +
              </button>
            </div>
            <button onClick={handleAddToCart} className="px-8 py-4 text-base font-semibold transition rounded-full bg-neon text-night hover:bg-white">
              Add {quantity} ticket{quantity > 1 ? 's' : ''} to cart
            </button>
          </div>
          {message ? <p className="mt-4 text-sm text-neon">{message}</p> : null}
        </div>
      </section>
    </motion.div>
  );
}

export default EventDetails;

