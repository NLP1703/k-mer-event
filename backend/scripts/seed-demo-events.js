import dotenv from 'dotenv';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import '../models/index.js';
import { Event } from '../models/Event.js';

dotenv.config();

const DEMO_EVENTS = [
  {
    title: 'Afro Vibes Festival 2026',
    description:
      'A giant Afrobeat and Amapiano festival bringing together top DJs, dancers, influencers, food vendors, and immersive nightlife experiences in the heart of Yaoundé.',
    category: 'Festival',
    date: '2026-08-12',
    time: '20:00',
    location: 'Yaoundé, Cameroon',
    organizer: 'K-MER Events',
    price: 15000,
    availableTickets: 500,
    status: 'upcoming',
    tags: ['Afrobeats', 'Nightlife', 'Festival'],
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
  },
  {
    title: 'Douala Neon Party',
    description:
      'An unforgettable neon nightlife experience with EDM, Afro-house, laser shows, cocktails, and celebrity guest DJs.',
    category: 'Nightlife',
    date: '2026-07-18',
    time: '22:00',
    location: 'Douala, Cameroon',
    organizer: 'Neon Wave',
    price: 10000,
    availableTickets: 300,
    status: 'upcoming',
    tags: ['EDM', 'Party', 'Nightlife'],
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a',
  },
  {
    title: 'Cameroon Tech Summit',
    description:
      'A modern technology conference focused on startups, AI, cybersecurity, blockchain, and digital innovation in Africa.',
    category: 'Technology',
    date: '2026-09-05',
    time: '09:00',
    location: 'Yaoundé, Cameroon',
    organizer: 'Tech Africa Hub',
    price: 25000,
    availableTickets: 200,
    status: 'upcoming',
    tags: ['AI', 'Startup', 'Innovation'],
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865',
  },
  {
    title: 'Kribi Beach Festival',
    description:
      'A beachside music and food festival with live bands, DJs, cocktails, seafood grills, and sunset parties.',
    category: 'Festival',
    date: '2026-08-25',
    time: '16:00',
    location: 'Kribi, Cameroon',
    organizer: 'Ocean Life Events',
    price: 12000,
    availableTickets: 400,
    status: 'upcoming',
    tags: ['Beach', 'Music', 'Summer'],
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  },
  {
    title: 'Buea Fashion Week',
    description:
      'A glamorous fashion showcase featuring modern African designers, runway shows, celebrity guests, and luxury brands.',
    category: 'Fashion',
    date: '2026-10-10',
    time: '18:00',
    location: 'Buea, Cameroon',
    organizer: 'Elite Fashion Group',
    price: 20000,
    availableTickets: 250,
    status: 'upcoming',
    tags: ['Fashion', 'Runway', 'Luxury'],
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
  },
  {
    title: 'Makossa Legends Live',
    description:
      'A legendary Makossa concert celebrating classic Cameroonian music with live orchestras and iconic artists.',
    category: 'Concert',
    date: '2026-11-02',
    time: '19:30',
    location: 'Douala, Cameroon',
    organizer: 'Golden Sound',
    price: 18000,
    availableTickets: 350,
    status: 'upcoming',
    tags: ['Makossa', 'Live Music', 'Concert'],
    image: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34',
  },
  {
    title: 'Limbe Food & Drinks Expo',
    description:
      'Discover the best street food, cocktails, seafood, and local delicacies from top chefs and restaurants.',
    category: 'Food & Drinks',
    date: '2026-06-20',
    time: '12:00',
    location: 'Limbe, Cameroon',
    organizer: 'Taste Cameroon',
    price: 7000,
    availableTickets: 600,
    status: 'upcoming',
    tags: ['Food', 'Cocktails', 'Expo'],
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
  },
  {
    title: 'Bamenda Youth Business Forum',
    description:
      'A business networking event empowering young entrepreneurs, startups, and investors across Cameroon.',
    category: 'Business',
    date: '2026-09-15',
    time: '10:00',
    location: 'Bamenda, Cameroon',
    organizer: 'Future Leaders Africa',
    price: 5000,
    availableTickets: 450,
    status: 'upcoming',
    tags: ['Business', 'Networking', 'Startup'],
    image: 'https://images.unsplash.com/photo-1515169067868-5387ec356754',
  },
];

function parseCityAndVenue(location) {
  // Input examples: "Yaoundé, Cameroon"
  // We keep city as the first segment, and venue as the full location.
  const parts = String(location).split(',').map((s) => s.trim());
  const city = parts[0] || location;
  const venue = location;
  return { city, venue };
}

function statusToDbStatus(status) {
  // DB expects: 'draft' | 'published' | 'cancelled'
  // Input uses: 'upcoming'
  if (status === 'cancelled') return 'cancelled';
  return 'published';
}

function dateTimeToStartDate(dateStr, timeStr) {
  // Build a local-time Date from YYYY-MM-DD and HH:mm
  const [year, month, day] = dateStr.split('-').map((x) => Number(x));
  const [hh, mm] = timeStr.split(':').map((x) => Number(x));
  return new Date(year, month - 1, day, hh, mm, 0);
}

async function seed() {
  // Ensure connection
  await sequelize.authenticate();

  const titles = DEMO_EVENTS.map((e) => e.title);

  const existing = await Event.findAll({
    where: {
      title: {
        [Op.in]: titles,
      },
    },
  });

  const existingByTitle = new Map(existing.map((e) => [e.title, e]));

  const upserted = [];

  for (const ev of DEMO_EVENTS) {
    const { city, venue } = parseCityAndVenue(ev.location);
    const start_date = dateTimeToStartDate(ev.date, ev.time);

    const payload = {
      title: ev.title,
      description: ev.description,
      category: ev.category,
      venue,
      city,
      organizer: ev.organizer,
      banner_url: ev.image,
      start_date,
      end_date: null,
      ticket_price: ev.price,
      ticket_quantity: ev.availableTickets,
      remaining_tickets: ev.availableTickets,
      status: statusToDbStatus(ev.status),
      tags: JSON.stringify(ev.tags || []),
      social_links: JSON.stringify({}),

    };

    const found = existingByTitle.get(ev.title);

    if (found) {
      await found.update(payload);
      upserted.push(found.id);
    } else {
      const created = await Event.create(payload);
      upserted.push(created.id);
    }
  }

  console.log(`✅ Seeded ${upserted.length} demo events`);
  return upserted;
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed demo events failed:', err);
    process.exit(1);
  });

