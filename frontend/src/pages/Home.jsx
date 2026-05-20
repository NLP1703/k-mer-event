import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchEvents } from '../services/api.js';
import EventCard from '../components/EventCard.jsx';

function Home() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEvents({ search }).then((data) => setEvents(data.events)).catch(console.error);
  }, [search]);

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-[36px] border border-white/10 p-10">
          <span className="mb-4 inline-flex rounded-full bg-neon/15 px-4 py-2 text-xs uppercase tracking-[0.35em] text-neon">Afro-futuristic booking</span>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-white">Discover Cameroon&apos;s most electric live events and festival ticket experiences.</h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">Browse concert lineups, cultural showcases, nightlife experiences, and premium festivals with fast checkout and QR ticket delivery.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="rounded-full bg-neon px-6 py-3 text-sm font-semibold text-night transition hover:bg-white">Explore events</button>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/90 transition hover:border-neon">See trending</button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-[36px] border border-white/10 p-8">
          <h2 className="text-2xl font-semibold text-white">Search premium events</h2>
          <label className="mt-6 block text-sm uppercase tracking-[0.25em] text-white/60">Find by name or city</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-white placeholder:text-white/35 focus:border-neon focus:ring-0"
            placeholder="Search concerts, festivals, nightlife..."
          />
          <div className="mt-8 grid gap-4">
            <div className="glass-card rounded-3xl border border-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-white/60">Featured city</p>
              <p className="mt-3 text-lg font-semibold text-white">Douala</p>
            </div>
            <div className="glass-card rounded-3xl border border-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-white/60">Popular category</p>
              <p className="mt-3 text-lg font-semibold text-white">Afrobeat Nights</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-neon">Live events</p>
            <h2 className="text-3xl font-semibold text-white">Trending lineup</h2>
          </div>
          <p className="text-sm text-white/60">Updated for Cameroon festival season.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
