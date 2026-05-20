import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchUsersForAdmin } from '../services/api.js';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchUsersForAdmin();
        setUsers(data.users || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Unable to load users');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card rounded-[36px] border border-white/10 p-8 text-white/70">Loading users...</div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-card rounded-[36px] border border-white/10 p-8 text-rose-400">{error}</div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="glass-card rounded-[36px] border border-white/10 p-8">
        <h1 className="text-4xl font-semibold text-white">Admin - Utilisateurs</h1>
        <p className="mt-3 text-white/70">Voir les utilisateurs enregistrés sur la plateforme.</p>
      </div>

      <section className="glass-card rounded-[36px] border border-white/10 p-8">
        <h2 className="text-2xl font-semibold text-white">Liste des utilisateurs</h2>

        {users.length === 0 ? (
          <p className="mt-4 text-white/70">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-white/60">
                  <th className="py-3 pr-6">Nom</th>
                  <th className="py-3 pr-6">Email</th>
                  <th className="py-3 pr-6">Rôle</th>
                  <th className="py-3 pr-6">Téléphone</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="text-sm border-t border-white/10 text-white/80">
                    <td className="py-3 pr-6">
                      <div className="font-semibold text-white">{u.name}</div>
                    </td>
                    <td className="py-3 pr-6">{u.email}</td>
                    <td className="py-3 pr-6">{u.role}</td>
                    <td className="py-3 pr-6">{u.telephone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default AdminUsers;

