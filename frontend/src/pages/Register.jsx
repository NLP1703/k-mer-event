import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

function Register() {
  const { register } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    prenom: '',
    telephone: '',
    email: '',
    password: '',
    role: 'user',
    organization_name: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Backend route: POST /api/auth/register
      // We reuse AuthContext.login to store user/token after registration.
      // AuthContext.login expects same shape as backend returns: { user, token }
      const response = await register(form);
      // If login() succeeded, redirect.
      // If your login() only accepts {email,password}, adjust in next step.
      if (response?.user) navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to register.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md rounded-[36px] border border-white/10 bg-black/50 p-10 shadow-glow"
    >
      <h1 className="text-3xl font-semibold text-white">Create your account</h1>
      <p className="mt-3 text-white/70">Sign up to book events and manage your tickets.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm text-white/60">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
            required
          />
        </label>

        <label className="block text-sm text-white/60">
          Prenom
          <input
            type="text"
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
            required
          />
        </label>

        <label className="block text-sm text-white/60">
          Telephone
          <input
            type="tel"
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
            required
          />
        </label>



        <label className="block text-sm text-white/60">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
            required
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm text-white/60">Je suis un</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, role: 'user' }))}
              className={
                form.role === 'user'
                  ? 'px-4 py-2 rounded-full bg-neon text-night font-semibold'
                  : 'px-4 py-2 rounded-full border border-white/10 text-white/80'
              }
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, role: 'organizer' }))}
              className={
                form.role === 'organizer'
                  ? 'px-4 py-2 rounded-full bg-neon text-night font-semibold'
                  : 'px-4 py-2 rounded-full border border-white/10 text-white/80'
              }
            >
              Organisateur
            </button>
          </div>
        </div>

        {form.role === 'organizer' ? (
          <label className="block text-sm text-white/60">
            Organization name
            <input
              type="text"
              value={form.organization_name}
              onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
              className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
              required
            />
          </label>
        ) : null}

        <label className="block text-sm text-white/60">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-white border rounded-3xl border-white/10 bg-black/30"
            required
            minLength={8}
          />
        </label>


        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          className="w-full px-6 py-4 text-base font-semibold transition rounded-full bg-neon text-night hover:bg-white"
        >
          Sign up
        </button>
      </form>
    </motion.div>
  );
}

export default Register;

