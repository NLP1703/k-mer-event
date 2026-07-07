import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CalendarCheck, Ticket, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchEvents, fetchPresence, fetchWeeklyUsage, fetchDashboardStats } from '../services/api.js';
import { socket } from '../lib/socket.js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card } from '../components/ui';
import { useChartTheme } from '../lib/chartTheme.js';

// "Online since" -> compact relative label (e.g. "5 min", "2 h").
const sinceLabel = (iso) => {
  if (!iso) return '';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
};

const roleBadge = (role) => {
  const map = {
    admin: 'bg-primary/15 text-primary',
    organizer: 'bg-accent/15 text-accent',
    user: 'bg-surface-hover text-muted',
  };
  return map[role] || map.user;
};

const formatCurrency = (n) =>
  `FCFA ${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;

function KpiTile({ icon: Icon, label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="p-6">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </span>
        <p className="mt-4 text-xs font-bold tracking-wider uppercase text-subtle">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold text-fg tabular-nums">{value ?? '—'}</p>
      </Card>
    </motion.div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [, setEvents] = useState([]);
  const [presence, setPresence] = useState({ users: [], totalUsers: 0, guests: 0, totalOnline: 0 });
  const [usage, setUsage] = useState([]);
  const { user } = useAuth();
  const chart = useChartTheme();

  useEffect(() => {
    // Uses the shared API client (in-memory access token + auto-refresh on 401).
    fetchDashboardStats().then(setStats).catch(console.error);

    fetchEvents().then((data) => setEvents(data.events.slice(0, 5))).catch(console.error);

    // Live presence: load the initial snapshot, then keep it fresh over the socket.
    fetchPresence().then(setPresence).catch(console.error);
    fetchWeeklyUsage(8).then((data) => setUsage(data.weeks || [])).catch(console.error);

    const onPresence = (snapshot) => setPresence(snapshot);
    socket.on('presence:update', onPresence);
    return () => socket.off('presence:update', onPresence);
  }, []);

  if (!user) return <p className="text-muted">Chargement…</p>;

  const legendText = (value) => <span style={{ color: chart.ink, fontSize: 12 }}>{value}</span>;
  const axisProps = {
    stroke: chart.ink,
    tick: { fill: chart.ink, fontSize: 12 },
    axisLine: false,
    tickLine: false,
  };

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-primary">Administration</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm text-muted">
          Réservations, revenus et performance des événements en un coup d’œil.
        </p>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={Users} label="Utilisateurs" value={stats?.totalUsers} />
        <KpiTile icon={CalendarCheck} label="Événements" value={stats?.totalEvents} delay={0.05} />
        <KpiTile icon={Ticket} label="Réservations" value={stats?.totalBookings} delay={0.1} />
        <KpiTile
          icon={Wallet}
          label="Revenus"
          value={stats?.revenue != null ? formatCurrency(stats.revenue) : undefined}
          delay={0.15}
        />
      </div>

      {/* En ligne maintenant (temps réel) + utilisation hebdomadaire */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card as="section" className="p-6 xl:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-semibold text-fg">En ligne</h2>
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-success" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-success" />
              </span>
              {presence.totalOnline} en direct
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 text-center border rounded-xl border-border bg-bg">
              <p className="font-display text-2xl font-bold text-fg tabular-nums">{presence.totalUsers}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">Connectés</p>
            </div>
            <div className="p-4 text-center border rounded-xl border-border bg-bg">
              <p className="font-display text-2xl font-bold text-fg tabular-nums">{presence.guests}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">Invités</p>
            </div>
          </div>

          <div className="pr-1 space-y-2 overflow-y-auto max-h-80">
            {presence.users.length === 0 && (
              <p className="text-sm text-muted">Aucun utilisateur connecté pour le moment.</p>
            )}
            {presence.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 border rounded-xl border-border bg-bg">
                <div className="flex items-center min-w-0 gap-3">
                  <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-grad-brand text-white text-sm font-bold">
                    {(u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-fg">{u.name || 'Utilisateur'}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
                <span className="text-xs shrink-0 text-muted">{sinceLabel(u.since)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" className="p-6 xl:col-span-2">
          <h2 className="font-display text-lg font-semibold text-fg">Utilisation par semaine</h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            Utilisateurs actifs, réservations et nouvelles inscriptions.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage} barGap={2}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis
                  dataKey="weekStart"
                  {...axisProps}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={{ color: chart.tooltip.color, fontWeight: 600 }}
                  itemStyle={{ color: chart.tooltip.color }}
                  cursor={{ fill: chart.cursor }}
                  labelFormatter={(value) => `Semaine du ${new Date(value).toLocaleDateString('fr-FR')}`}
                />
                <Legend formatter={legendText} />
                <Bar dataKey="activeUsers" name="Utilisateurs actifs" fill={chart.series[0]} barSize={12} radius={[4, 4, 0, 0]} />
                <Bar dataKey="bookings" name="Réservations" fill={chart.series[1]} barSize={12} radius={[4, 4, 0, 0]} />
                <Bar dataKey="newUsers" name="Inscriptions" fill={chart.series[2]} barSize={12} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card as="section" className="p-6">
          <h2 className="mb-6 font-display text-lg font-semibold text-fg">Revenus (30 derniers jours)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.revenueData || []}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis
                  dataKey="date"
                  {...axisProps}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={{ color: chart.tooltip.color, fontWeight: 600 }}
                  itemStyle={{ color: chart.tooltip.color }}
                  cursor={{ stroke: chart.grid }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                  formatter={(value) => [formatCurrency(value), 'Revenus']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={chart.primary}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: chart.primary, stroke: chart.tooltip.backgroundColor, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card as="section" className="p-6">
          <h2 className="mb-6 font-display text-lg font-semibold text-fg">Réservations (30 derniers jours)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.bookingsData || []}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis
                  dataKey="date"
                  {...axisProps}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={{ color: chart.tooltip.color, fontWeight: 600 }}
                  itemStyle={{ color: chart.tooltip.color }}
                  cursor={{ fill: chart.cursor }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                  formatter={(value) => [value, 'Réservations']}
                />
                <Bar dataKey="bookings" fill={chart.series[1]} barSize={12} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card as="section" className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-fg">Meilleurs événements</h2>
          <div className="space-y-3">
            {stats?.eventPerformance?.slice(0, 5).map((event, index) => (
              <div key={event.id} className="flex items-center justify-between p-4 border rounded-xl border-border bg-bg">
                <div className="flex items-center min-w-0 gap-4">
                  <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-primary/10 font-display font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate text-fg">{event.title}</h3>
                    <p className="text-xs text-muted">
                      {event.booking_count} réservation{event.booking_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <p className="font-display font-bold shrink-0 text-primary tabular-nums">
                  {formatCurrency(event.total_revenue)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" className="p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-fg">Dernières réservations</h2>
          <div className="space-y-3">
            {stats?.recentBookings?.slice(0, 5).map((booking) => (
              <div key={booking.id} className="p-4 border rounded-xl border-border bg-bg">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate text-fg">{booking.booking_number}</h3>
                    <p className="text-xs truncate text-muted">{booking.event?.title}</p>
                    <p className="text-xs truncate text-subtle">
                      {booking.user?.name} · {booking.customer_email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-primary tabular-nums">
                      {formatCurrency(booking.total_price)}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(booking.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card as="section" className="p-6">
        <h2 className="font-display text-lg font-semibold text-fg">Capacité des événements</h2>
        <div className="grid gap-3 mt-5">
          {stats?.topEvents?.map((event) => {
            const sold = event.ticket_quantity - event.remaining_tickets;
            const pct = event.ticket_quantity > 0 ? (sold / event.ticket_quantity) * 100 : 0;
            return (
              <div key={event.id} className="p-4 border rounded-xl border-border bg-bg">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate text-fg">{event.title}</h3>
                    <p className="text-xs text-muted">Capacité : {event.ticket_quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Restants : {event.remaining_tickets}</p>
                    <div className="w-32 h-1.5 mt-2 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
