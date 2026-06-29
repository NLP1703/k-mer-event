import request from 'supertest';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/db.js';
import app from '../../app.js';
import { User, Event } from '../../models/index.js';

let adminToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const email = 'admin@kmer.test';
  await User.create({ name: 'Admin', email, password: await bcrypt.hash('Admin12345', 12), role: 'admin' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Admin12345' });
  adminToken = res.body.accessToken;

  // Seed 25 published events to exercise pagination.
  const rows = [];
  for (let i = 0; i < 25; i += 1) {
    rows.push({
      title: `Concert ${i}`,
      description: i === 0 ? 'Unique jazz description' : 'generic',
      category: 'music',
      venue: 'Palais',
      city: i % 2 ? 'Douala' : 'Yaoundé',
      organizer: 'Admin',
      start_date: new Date(Date.now() + i * 86400000),
      ticket_price: 1000 + i,
      ticket_quantity: 100,
      remaining_tickets: 100,
      status: 'published',
    });
  }
  await Event.bulkCreate(rows);
  // One draft that must NEVER appear in the public list.
  await Event.create({
    title: 'Secret draft',
    description: 'hidden',
    category: 'music',
    venue: 'X',
    city: 'Douala',
    organizer: 'Admin',
    start_date: new Date(),
    status: 'draft',
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/events pagination & filtering', () => {
  it('returns a paginated envelope with totals and next/previous', async () => {
    const res = await request(app).get('/api/events?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(10);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 25, totalPages: 3, next: 2, previous: null });
  });

  it('serves the last page correctly', async () => {
    const res = await request(app).get('/api/events?page=3&limit=10');
    expect(res.body.events).toHaveLength(5);
    expect(res.body.pagination.next).toBeNull();
    expect(res.body.pagination.previous).toBe(2);
  });

  it('never exposes draft/pending events publicly', async () => {
    const res = await request(app).get('/api/events?limit=100');
    expect(res.body.events.some((e) => e.title === 'Secret draft')).toBe(false);
  });

  it('searches across multiple columns', async () => {
    const res = await request(app).get('/api/events?search=jazz');
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].title).toBe('Concert 0');
  });

  it('filters by city and sorts by price desc', async () => {
    const res = await request(app).get('/api/events?city=Douala&sort=price&order=desc&limit=5');
    expect(res.body.events.every((e) => e.city === 'Douala')).toBe(true);
    const prices = res.body.events.map((e) => e.ticket_price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it('ignores admin=true from a non-admin (no stats leak)', async () => {
    const res = await request(app).get('/api/events?admin=true&limit=5');
    expect(res.body.events[0].sold_tickets).toBeUndefined();
  });
});
