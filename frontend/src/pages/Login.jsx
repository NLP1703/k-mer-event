import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to login.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-md rounded-[36px] border border-border bg-surface p-6 sm:p-10 shadow-elevated"
    >
      <h1 className="text-3xl font-semibold text-fg">Welcome back</h1>

      <p className="mt-3 text-muted">Login to continue browsing events and manage your bookings.</p>
      <div className="mt-6 text-sm text-muted">
        Don’t have an account?{' '}
        <a href="/register" className="text-primary hover:text-fg underline">Sign up</a>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm text-muted">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-3 w-full rounded-3xl border border-border bg-bg-elevated px-5 py-4 text-fg"
            required
          />
        </label>
        <label className="block text-sm text-muted">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-3 w-full rounded-3xl border border-border bg-bg-elevated px-5 py-4 text-fg"
            required
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button type="submit" className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-fg transition hover:bg-primary-hover">
          Sign in
        </button>
      </form>
    </motion.div>
  );
}

export default Login;
