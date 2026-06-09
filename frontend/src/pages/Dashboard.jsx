import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchEvents } from '../services/api.js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetch('/api/dashboard', { headers: { Authorization: `Bearer ${localStorage.getItem('kmer-token')}` } })
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);

    fetchEvents().then((data) => setEvents(data.events.slice(0, 5))).catch(console.error);
  }, []);

  if (!user) return <p className="text-muted">Loading...</p>;

  return (
    <div className="space-y-10">
      <div className="glass-card rounded-[36px] border border-border p-10">
        <h1 className="text-4xl font-semibold text-fg">Admin dashboard</h1>
        <p className="mt-3 text-muted">Monitor bookings, revenue, and event performance at a glance.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        {[
          { label: 'Users', value: stats?.totalUsers },
          { label: 'Events', value: stats?.totalEvents },
          { label: 'Bookings', value: stats?.totalBookings },
          { label: 'Revenue', value: stats?.revenue ? `FCFA ${stats.revenue.toFixed(0)}` : 'FCFA 0' }
        ].map((item) => (
          <motion.div key={item.label} whileHover={{ y: -4 }} className="glass-card rounded-3xl border border-border p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-primary">{item.label}</p>
            <p className="mt-4 text-4xl font-semibold text-fg">{item.value || '—'}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card rounded-[36px] border border-border p-10">
          <h2 className="text-2xl font-semibold text-fg mb-6">Revenue Trend (Last 30 Days)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.28)" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b18',
                    border: '1px solid rgba(148,163,184,0.28)',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [`FCFA ${value}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#00ffd5" strokeWidth={3} dot={{ fill: '#00ffd5', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-[36px] border border-border p-10">
          <h2 className="text-2xl font-semibold text-fg mb-6">Bookings Trend (Last 30 Days)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.bookingsData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.28)" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070b18',
                    border: '1px solid rgba(148,163,184,0.28)',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value, 'Bookings']}
                />
                <Bar dataKey="bookings" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card rounded-[36px] border border-border p-10">
          <h2 className="text-2xl font-semibold text-fg mb-6">Top Performing Events</h2>
          <div className="space-y-4">
            {stats?.eventPerformance?.slice(0, 5).map((event, index) => (
              <div key={event.id} className="flex items-center justify-between rounded-3xl border border-border bg-surface p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">{index + 1}</div>
                  <div>
                    <h3 className="font-semibold text-fg">{event.title}</h3>
                    <p className="text-sm text-muted">{event.booking_count} bookings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">FCFA {(Number(event.total_revenue) || 0).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[36px] border border-border p-10">
          <h2 className="text-2xl font-semibold text-fg mb-6">Recent Bookings</h2>
          <div className="space-y-4">
            {stats?.recentBookings?.slice(0, 5).map((booking) => (
              <div key={booking.id} className="rounded-3xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-fg">{booking.booking_number}</h3>
                    <p className="text-sm text-muted">{booking.event?.title}</p>
                    <p className="text-xs text-subtle">{booking.user?.name} • {booking.customer_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">FCFA {(Number(booking.total_price) || 0).toFixed(0)}</p>
                    <p className="text-xs text-muted">{new Date(booking.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-card rounded-[36px] border border-border p-10">
        <h2 className="text-2xl font-semibold text-fg">Top Events by Capacity</h2>
        <div className="mt-6 grid gap-4">
          {stats?.topEvents?.map((event) => (
            <div key={event.id} className="rounded-3xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-fg">{event.title}</h3>
                  <p className="text-sm text-muted">Capacity: {event.ticket_quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">Remaining: {event.remaining_tickets}</p>
                  <div className="mt-2 h-2 w-32 rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${((event.ticket_quantity - event.remaining_tickets) / event.ticket_quantity) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;

