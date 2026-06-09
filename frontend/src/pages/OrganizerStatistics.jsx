import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchOrganizerStatistics,
  fetchOrganizerEventStatistics,
} from '../services/api.js';

const formatCurrency = (n) =>
  `FCFA ${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`;

function OrganizerStatistics() {
  const { user } = useAuth();
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

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'organizer') return <Navigate to="/" replace />;

  if (loading) {
    return <p className="text-muted">Chargement des statistiques...</p>;
  }

  if (error) {
    return <p className="text-danger">{error}</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="glass-card rounded-[36px] border border-border p-10">
        <h1 className="text-4xl font-semibold text-fg">Mes statistiques</h1>
        <p className="mt-3 text-muted">
          Vue d’ensemble des performances de vos événements.
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            label: 'Événements créés',
            value: stats?.total_events ?? 0,
          },
          {
            label: 'Billets vendus',
            value: stats?.total_tickets_sold ?? 0,
          },
          {
            label: 'Revenus générés',
            value: formatCurrency(stats?.total_revenue),
          },
        ].map((item) => (
          <motion.div
            key={item.label}
            whileHover={{ y: -4 }}
            className="p-6 border glass-card rounded-3xl border-border"
          >
            <p className="text-sm uppercase tracking-[0.25em] text-primary">
              {item.label}
            </p>
            <p className="mt-4 text-4xl font-semibold text-fg">
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Per-event breakdown */}
      <section className="glass-card rounded-[36px] border border-border p-10">
        <h2 className="text-2xl font-semibold text-fg">
          Détail par événement
        </h2>

        {!sortedEvents.length ? (
          <p className="mt-6 text-muted">
            Vous n’avez pas encore créé d’événement.
          </p>
        ) : (
          <div className="grid gap-4 mt-6">
            {sortedEvents.map((event) => {
              const fill = Math.max(0, Math.min(100, event.fill_rate || 0));
              return (
                <div
                  key={event.id}
                  className="p-5 border rounded-3xl border-border bg-surface"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-fg">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {event.start_date
                          ? new Date(event.start_date).toLocaleDateString()
                          : '—'}{' '}
                        · Statut : {event.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {formatCurrency(event.revenue)}
                      </p>
                      <p className="text-xs text-muted">
                        Taux de remplissage : {fill.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 mt-4 sm:grid-cols-3">
                    <div className="p-3 border rounded-2xl border-border bg-bg-elevated">
                      <p className="text-xs text-muted">Disponibles</p>
                      <p className="mt-1 text-base font-semibold text-fg">
                        {event.ticket_quantity}
                      </p>
                    </div>
                    <div className="p-3 border rounded-2xl border-border bg-bg-elevated">
                      <p className="text-xs text-muted">Vendus</p>
                      <p className="mt-1 text-base font-semibold text-fg">
                        {event.sold_tickets}
                      </p>
                    </div>
                    <div className="p-3 border rounded-2xl border-border bg-bg-elevated">
                      <p className="text-xs text-muted">Restants</p>
                      <p className="mt-1 text-base font-semibold text-fg">
                        {event.remaining_tickets}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default OrganizerStatistics;
