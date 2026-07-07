import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { CalendarCheck, Ticket, Wallet } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchOrganizerStatistics,
  fetchOrganizerEventStatistics,
} from '../services/api.js';
import { Card, Skeleton } from '../components/ui';
import { useChartTheme } from '../lib/chartTheme.js';
import { cn } from '../lib/cn.js';

const formatCurrency = (n) =>
  `FCFA ${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;

const truncate = (s, max = 18) =>
  typeof s === 'string' && s.length > max ? `${s.slice(0, max - 1)}…` : s;

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
        <p className="mt-1 font-display text-3xl font-bold text-fg tabular-nums">{value}</p>
      </Card>
    </motion.div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="w-40 h-4" />
        <Skeleton className="w-64 h-9" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function OrganizerStatistics() {
  const { user } = useAuth();
  const chart = useChartTheme();
  const [stats, setStats] = useState(null);
  const [perEvent, setPerEvent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'organizer') return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [globalData, eventsData] = await Promise.all([
          fetchOrganizerStatistics(),
          fetchOrganizerEventStatistics(),
        ]);
        if (!cancelled) {
          setStats(globalData?.statistics || null);
          setPerEvent(eventsData?.events || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              'Impossible de charger les statistiques',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const sortedEvents = useMemo(
    () =>
      [...perEvent].sort(
        (a, b) =>
          new Date(b.start_date || 0).getTime() -
          new Date(a.start_date || 0).getTime(),
      ),
    [perEvent],
  );

  // Top événements par revenus pour le graphique (barres horizontales).
  const revenueData = useMemo(
    () =>
      [...perEvent]
        .map((e) => ({ name: e.title, revenue: Number(e.revenue) || 0, sold: e.sold_tickets }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
    [perEvent],
  );
  const hasRevenue = revenueData.some((d) => d.revenue > 0);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'organizer') return <Navigate to="/" replace />;

  if (loading) return <StatisticsSkeleton />;

  if (error) {
    return (
      <Card className="p-10 text-center">
        <p className="text-danger">{error}</p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-primary">
          Espace organisateur
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">
          Mes statistiques
        </h1>
        <p className="mt-2 text-sm text-muted">
          Vue d’ensemble des performances de vos événements.
        </p>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile icon={CalendarCheck} label="Événements créés" value={stats?.total_events ?? 0} />
        <KpiTile
          icon={Ticket}
          label="Billets vendus"
          value={stats?.total_tickets_sold ?? 0}
          delay={0.06}
        />
        <KpiTile
          icon={Wallet}
          label="Revenus générés"
          value={formatCurrency(stats?.total_revenue)}
          delay={0.12}
        />
      </div>

      {/* Revenus par événement */}
      {hasRevenue ? (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-fg">Revenus par événement</h2>
          <p className="mt-1 text-sm text-muted">Vos meilleures ventes, du plus rentable au moins rentable.</p>
          <div className="mt-6" style={{ height: Math.max(200, revenueData.length * 48) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis
                  type="number"
                  stroke={chart.ink}
                  tick={{ fill: chart.ink, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  stroke={chart.ink}
                  tick={{ fill: chart.ink, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => truncate(v)}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={{ color: chart.tooltip.color, fontWeight: 600 }}
                  itemStyle={{ color: chart.tooltip.color }}
                  cursor={{ fill: chart.cursor }}
                  formatter={(value, name, entry) => [
                    `${formatCurrency(value)} · ${entry?.payload?.sold ?? 0} billets`,
                    'Revenus',
                  ]}
                />
                <Bar dataKey="revenue" fill={chart.primary} barSize={18} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {/* Détail par événement */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-fg">Détail par événement</h2>

        {!sortedEvents.length ? (
          <Card className="p-8 text-center">
            <p className="text-muted">Vous n’avez pas encore créé d’événement.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedEvents.map((event) => {
              const fill = Math.max(0, Math.min(100, event.fill_rate || 0));
              return (
                <Card key={event.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-display text-base font-semibold text-fg">{event.title}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {event.start_date
                          ? new Date(event.start_date).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}{' '}
                        · Statut : {event.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary tabular-nums">
                        {formatCurrency(event.revenue)}
                      </p>
                      <p className="text-xs text-muted">
                        Taux de remplissage : {fill.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 mt-4 sm:grid-cols-3">
                    {[
                      { label: 'Disponibles', value: event.ticket_quantity },
                      { label: 'Vendus', value: event.sold_tickets },
                      { label: 'Restants', value: event.remaining_tickets },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 border rounded-xl border-border bg-bg">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="mt-1 font-display text-base font-semibold text-fg tabular-nums">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-surface-hover"
                      role="img"
                      aria-label={`Taux de remplissage ${fill.toFixed(0)}%`}
                    >
                      <div
                        className={cn('h-full rounded-full', fill >= 90 ? 'bg-success' : 'bg-primary')}
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default OrganizerStatistics;
