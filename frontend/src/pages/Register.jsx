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
      className="mx-auto max-w-md rounded-[36px] border border-border bg-surface p-10 shadow-elevated"
    >
      <h1 className="text-3xl font-semibold text-fg">Create your account</h1>
      <p className="mt-3 text-muted">Sign up to book events and manage your tickets.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm text-muted">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated"
            required
          />
        </label>

        <label className="block text-sm text-muted">
          Prenom
          <input
            type="text"
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated"
            required
          />
        </label>

        <label className="block text-sm text-muted">
          Telephone
          <input
            type="tel"
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated"
            required
          />
        </label>



        <label className="block text-sm text-muted">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated"
            required
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm text-muted">Je suis un</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, role: 'user' }))}
              className={
                form.role === 'user'
                  ? 'px-4 py-2 rounded-full bg-primary text-primary-fg font-semibold'
                  : 'px-4 py-2 rounded-full border border-border text-muted'
              }
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, role: 'organizer' }))}
              className={
                form.role === 'organizer'
                  ? 'px-4 py-2 rounded-full bg-primary text-primary-fg font-semibold'
                  : 'px-4 py-2 rounded-full border border-border text-muted'
              }
            >
              Organisateur
            </button>
          </div>
        </div>

        {form.role === 'organizer' ? (
          <label className="block text-sm text-muted">
            Organization name
            <input
              type="text"
              value={form.organization_name}
              onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
              className="w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated"
              required
            />
          </label>
        ) : null}

        <label className="block text-sm text-muted">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-5 py-4 mt-3 text-fg border rounded-3xl border-border bg-bg-elevated"
            required
            minLength={8}
          />
        </label>


        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          className="w-full px-6 py-4 text-base font-semibold transition rounded-full bg-primary text-primary-fg hover:bg-primary-hover"
        >
          Sign up
        </button>
      </form>
    </motion.div>
  );
}

export default Register;

