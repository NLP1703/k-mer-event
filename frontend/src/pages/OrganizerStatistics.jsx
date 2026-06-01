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
    return <p className="text-white/70">Chargement des statistiques...</p>;
  }

  if (error) {
    return <p className="text-rose-400">{error}</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="glass-card rounded-[36px] border border-white/10 p-10">
        <h1 className="text-4xl font-semibold text-white">Mes statistiques</h1>
        <p className="mt-3 text-white/70">
          Vue d’ensemble des performances de vos événements.
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            label: 'Événements créés',
            value: stats?.total_events ?? 0,
            icon: '🎪',
          },
          {
            label: 'Billets vendus',
            value: stats?.total_tickets_sold ?? 0,
            icon: '🎫',
          },
          {
            label: 'Revenus générés',
            value: formatCurrency(stats?.total_revenue),
            icon: '💰',
          },
        ].map((item) => (
          <motion.div
            key={item.label}
            whileHover={{ y: -4 }}
            className="p-6 border glass-card rounded-3xl border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-neon">
                  {item.label}
                </p>
                <p className="mt-4 text-4xl font-semibold text-white">
                  {item.value}
                </p>
              </div>
              <span className="text-3xl">{item.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Per-event breakdown */}
      <section className="glass-card rounded-[36px] border border-white/10 p-10">
        <h2 className="text-2xl font-semibold text-white">
          Détail par événement
        </h2>

        {!sortedEvents.length ? (
          <p className="mt-6 text-white/70">
            Vous n’avez pas encore créé d’événement.
          </p>
        ) : (
          <div className="grid gap-4 mt-6">
            {sortedEvents.map((event) => {
              const fill = Math.max(0, Math.min(100, event.fill_rate || 0));
              return (
                <div
                  key={event.id}
                  className="p-5 border rounded-3xl border-white/10 bg-black/20"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-xs text-white/60">
                        {event.start_date
                          ? new Date(event.start_date).toLocaleDateString()
                          : '—'}{' '}
                        · Statut : {event.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neon">
                        {formatCurrency(event.revenue)}
                      </p>
                      <p className="text-xs text-white/60">
                        Taux de remplissage : {fill.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 mt-4 sm:grid-cols-3">
                    <div className="p-3 border rounded-2xl border-white/10 bg-black/30">
                      <p className="text-xs text-white/60">Disponibles</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {event.ticket_quantity}
                      </p>
                    </div>
                    <div className="p-3 border rounded-2xl border-white/10 bg-black/30">
                      <p className="text-xs text-white/60">Vendus</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {event.sold_tickets}
                      </p>
                    </div>
                    <div className="p-3 border rounded-2xl border-white/10 bg-black/30">
                      <p className="text-xs text-white/60">Restants</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {event.remaining_tickets}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-neon"
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
