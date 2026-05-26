import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchCurrentUserMe } from '../services/api.js';

function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        const data = await fetchCurrentUserMe();
        if (isMounted) setProfile(data.user || null);
      } catch (e) {
        const msg = e?.response?.data?.message || 'Impossible de charger votre profil';
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-4xl font-semibold text-white">Mon profil</h1>
        <p className="text-white/70">Chargement...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-4xl font-semibold text-white">Mon profil</h1>
        <p className="text-rose-400">{error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="glass-card rounded-[36px] border border-white/10 p-10">
        <h1 className="text-4xl font-semibold text-white">Mon profil</h1>
        <p className="mt-3 text-white/70">Informations de votre compte</p>

        <div className="grid gap-4 mt-8 md:grid-cols-2">
          <div className="p-6 border rounded-3xl border-white/10 bg-black/20">
            <p className="text-sm text-white/60">Nom</p>
            <p className="mt-2 text-lg font-semibold text-white">{profile?.name || '—'}</p>
          </div>
          <div className="p-6 border rounded-3xl border-white/10 bg-black/20">
            <p className="text-sm text-white/60">Email</p>
            <p className="mt-2 text-lg font-semibold text-white">{profile?.email || '—'}</p>
          </div>
          <div className="p-6 border rounded-3xl border-white/10 bg-black/20">
            <p className="text-sm text-white/60">Rôle</p>
            <p className="mt-2 text-lg font-semibold text-white">{profile?.role || '—'}</p>
          </div>
          <div className="p-6 border rounded-3xl border-white/10 bg-black/20">
            <p className="text-sm text-white/60">Actions</p>
            <div className="flex flex-col gap-3 mt-4">
              <a
                href="/bookings"
                className="px-5 py-3 text-sm font-semibold text-center transition rounded-full bg-neon text-night hover:bg-white"
              >
                Mes bookings
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Profile;

