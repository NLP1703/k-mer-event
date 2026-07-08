import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createUserForAdmin,
  deleteUserForAdmin,
  fetchUsersForAdmin,
  updateUserForAdmin,
} from '../services/api.js';

import AdminUserBookings from './AdminUserBookings.jsx';

function AdminUsers() {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showBookings, setShowBookings] = useState(false);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    telephone: '',
    role: 'user',
    avatar_url: '',
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    telephone: '',
    role: 'user',
    avatar_url: '',
  });

  const refreshUsers = async () => {
    const data = await fetchUsersForAdmin();
    setUsers(data.users || []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setError('');
        await refreshUsers();
      } catch (e) {
        setError(e.response?.data?.message || 'Unable to load users');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const canEdit = useMemo(() => editingId !== null, [editingId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await createUserForAdmin({ ...createForm });
      setCreateForm({ name: '', email: '', telephone: '', role: 'user', avatar_url: '' });
      await refreshUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create user');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      telephone: u.telephone || '',
      role: u.role || 'user',
      avatar_url: u.avatar_url || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', email: '', telephone: '', role: 'user', avatar_url: '' });
  };

  const handleUpdate = async (id) => {
    setCreating(true);
    setError('');
    try {
      await updateUserForAdmin(id, {
        name: editForm.name,
        email: editForm.email,
        telephone: editForm.telephone,
        role: editForm.role,
        avatar_url: editForm.avatar_url,
      });
      cancelEdit();
      await refreshUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update user');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Supprimer cet utilisateur ?');
    if (!ok) return;

    setCreating(true);
    setError('');
    try {
      await deleteUserForAdmin(id);
      if (editingId === id) cancelEdit();
      await refreshUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete user');
    } finally {
      setCreating(false);
    }
  };

  const handleViewBookings = (userId) => {
    setSelectedUserId(userId);
    setShowBookings(true);
  };

  if (showBookings) {
    return (
      <AdminUserBookings
        userId={selectedUserId}
        onBack={() => {
          setShowBookings(false);
          setSelectedUserId(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-surface shadow-card rounded-2xl border border-border p-8 text-muted">Loading users...</div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-surface shadow-card rounded-2xl border border-border p-8 text-danger">{error}</div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-surface shadow-card rounded-2xl border border-border p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg md:text-4xl">Utilisateurs</h1>
        <p className="mt-3 text-muted">Voir, créer, modifier et supprimer des utilisateurs.</p>
      </div>

      <section className="bg-surface shadow-card rounded-2xl border border-border p-8">
        <h2 className="text-2xl font-semibold text-fg">Créer un utilisateur</h2>

        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-muted">Nom</span>
            <input
              className="w-full px-4 py-3 mt-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
              value={createForm.name}
              onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted">Email</span>
            <input
              type="email"
              className="w-full px-4 py-3 mt-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
              value={createForm.email}
              onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted">Téléphone</span>
            <input
              className="w-full px-4 py-3 mt-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
              value={createForm.telephone}
              onChange={(e) => setCreateForm((s) => ({ ...s, telephone: e.target.value }))}
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted">Rôle</span>
            <select
              className="w-full px-4 py-3 mt-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
              value={createForm.role}
              onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value }))}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm text-muted">Avatar URL</span>
            <input
              className="w-full px-4 py-3 mt-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
              value={createForm.avatar_url}
              onChange={(e) => setCreateForm((s) => ({ ...s, avatar_url: e.target.value }))}
            />
          </label>

          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-3 text-fg border rounded-full border-border bg-surface-hover hover:border-primary disabled:opacity-60"
            >
              {creating ? 'En cours...' : 'Créer'}
            </button>
            {canEdit ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 py-3 text-fg border rounded-full border-border bg-surface-hover hover:border-primary"
              >
                Annuler édition
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="bg-surface shadow-card rounded-2xl border border-border p-8">
        <h2 className="text-2xl font-semibold text-fg">Liste des utilisateurs</h2>

        {users.length === 0 ? (
          <p className="mt-4 text-muted">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="py-3 pr-6">Nom</th>
                  <th className="py-3 pr-6">Email</th>
                  <th className="py-3 pr-6">Rôle</th>
                  <th className="py-3 pr-6">Téléphone</th>
                  <th className="py-3 pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isEditing = editingId === u.id;
                  return (
                    <tr key={u.id} className="text-sm border-t border-border text-muted">
                      <td className="py-3 pr-6">
                        {isEditing ? (
                          <input
                            className="w-48 px-3 py-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
                            value={editForm.name}
                            onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                          />
                        ) : (
                          <div className="font-semibold text-fg">{u.name}</div>
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        {isEditing ? (
                          <input
                            type="email"
                            className="w-56 px-3 py-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
                            value={editForm.email}
                            onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                          />
                        ) : (
                          u.email
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        {isEditing ? (
                          <select
                            className="px-3 py-2 text-fg border outline-none rounded-xl border-border bg-bg-elevated focus:border-primary"
                            value={editForm.role}
                            onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        {isEditing ? (
                          <input
                            className="px-3 py-2 text-fg border outline-none w-44 rounded-xl border-border bg-bg-elevated focus:border-primary"
                            value={editForm.telephone}
                            onChange={(e) => setEditForm((s) => ({ ...s, telephone: e.target.value }))}
                          />
                        ) : (
                          u.telephone || '-'
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        <div className="flex flex-wrap items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                disabled={creating}
                                onClick={() => handleUpdate(u.id)}
                                className="px-3 py-2 border rounded-full border-primary text-primary hover:bg-primary/10 disabled:opacity-60"
                              >
                                Sauver
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-3 py-2 text-fg border rounded-full border-border hover:border-border-strong"
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(u)}
                                className="px-3 py-2 text-fg border rounded-full border-border hover:border-primary"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewBookings(u.id)}
                                className="px-3 py-2 text-fg border rounded-full border-border hover:border-primary"
                              >
                                Voir bookings
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(u.id)}
                                className="px-3 py-2 text-fg border rounded-full border-border hover:border-danger hover:text-danger"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default AdminUsers;

