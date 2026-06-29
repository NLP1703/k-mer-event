import request from 'supertest';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../config/db.js';
import app from '../../app.js';
import { User, Event, Booking } from '../../models/index.js';

let userToken;
let adminToken;
let event;

const authHeader = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await User.create({ name: 'Admin', email: 'a@k.test', password: await bcrypt.hash('Admin12345', 12), role: 'admin' });
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'a@k.test', password: 'Admin12345' })).body.accessToken;

  const reg = await request(app).post('/api/auth/register').send({
    name: 'Buyer', telephone: '0600', email: 'b@k.test', password: 'Password123',
  });
  userToken = reg.body.accessToken;

  event = await Event.create({
    title: 'Show', description: 'd', category: 'music', venue: 'V', city: 'Douala',
    organizer: 'Admin', start_date: new Date(Date.now() + 86400000),
    ticket_price: 5000, ticket_quantity: 10, remaining_tickets: 10, status: 'published',
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('booking → payment → refund workflow', () => {
  let bookingId;

  it('creates a pending booking without deducting stock', async () => {
    const res = await request(app).post('/api/bookings').set(authHeader(userToken)).send({ eventId: event.id, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe('pending');
    bookingId = res.body.booking.id;
    const fresh = await Event.findByPk(event.id);
    expect(fresh.remaining_tickets).toBe(10); // not deducted yet
  });

  it('confirms the booking and deducts stock on successful payment', async () => {
    const res = await request(app).post('/api/payments').set(authHeader(userToken))
      .send({ bookingId, simulate: 'success' });
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('confirmed');
    expect(res.body.booking.status).toBe('confirmed');
    const fresh = await Event.findByPk(event.id);
    expect(fresh.remaining_tickets).toBe(8);
  });

  it('refunds: restores stock and cancels the booking', async () => {
    const res = await request(app).post(`/api/payments/${bookingId}/refund`).set(authHeader(adminToken)).send();
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('refunded');
    expect(res.body.booking.status).toBe('cancelled');
    const fresh = await Event.findByPk(event.id);
    expect(fresh.remaining_tickets).toBe(10);
  });

  it('rejects a failed payment and cancels the booking', async () => {
    const b = await request(app).post('/api/bookings').set(authHeader(userToken)).send({ eventId: event.id, quantity: 1 });
    const pay = await request(app).post('/api/payments').set(authHeader(userToken))
      .send({ bookingId: b.body.booking.id, simulate: 'fail' });
    expect(pay.status).toBe(402);
    expect(pay.body.booking.status).toBe('cancelled');
  });
});

describe('check-in is transactional and single-use', () => {
  it('validates once then reports already-checked-in on a second scan', async () => {
    const booking = await Booking.create({
      booking_number: 'KMER-CHECKTEST', user_id: (await User.findOne({ where: { email: 'b@k.test' } })).id,
      event_id: event.id, quantity: 1, total_price: 5000, status: 'confirmed',
    });

    const first = await request(app).post('/api/bookings/checkin').set(authHeader(adminToken)).send({ code: 'KMER-CHECKTEST' });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('ok');

    const second = await request(app).post('/api/bookings/checkin').set(authHeader(adminToken)).send({ code: 'KMER-CHECKTEST' });
    expect(second.status).toBe(409);
    expect(second.body.status).toBe('already');
    expect(booking).toBeTruthy();
  });
});

describe('favorites CRUD + sync', () => {
  it('adds, lists, syncs and removes favourites', async () => {
    const add = await request(app).post('/api/favorites').set(authHeader(userToken)).send({ eventId: event.id });
    expect(add.status).toBe(201);
    expect(add.body.eventIds).toContain(event.id);

    const list = await request(app).get('/api/favorites').set(authHeader(userToken));
    expect(list.body.eventIds).toContain(event.id);

    const sync = await request(app).post('/api/favorites/sync').set(authHeader(userToken)).send({ eventIds: [event.id] });
    expect(sync.body.eventIds.filter((id) => id === event.id)).toHaveLength(1); // idempotent

    const del = await request(app).delete(`/api/favorites/${event.id}`).set(authHeader(userToken));
    expect(del.body.eventIds).not.toContain(event.id);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });
});
