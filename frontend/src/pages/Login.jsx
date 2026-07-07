import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input } from '../components/ui';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      await login(form);
      navigate(location.state?.returnTo || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Connexion impossible. Vérifiez vos identifiants.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-6 border sm:p-10 rounded-3xl border-border bg-surface shadow-elevated">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-grad-brand text-white shadow-glow">
          <Ticket className="w-5 h-5" />
        </span>

        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          Bon retour parmi nous
        </h1>
        <p className="mt-2 text-sm text-muted">
          Connectez-vous pour réserver vos billets et retrouver vos réservations.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-bold tracking-wider uppercase text-subtle">E-mail</span>
            <div className="mt-2">
              <Input
                type="email"
                icon={Mail}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="vous@exemple.com"
                autoComplete="email"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold tracking-wider uppercase text-subtle">Mot de passe</span>
            <div className="mt-2">
              <Input
                type="password"
                icon={Lock}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error ? (
            <p className="px-4 py-3 text-sm border rounded-xl border-danger/30 bg-danger/10 text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
            <LogIn className="w-4 h-4" />
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-center text-muted">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline underline-offset-4">
            Créer un compte
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default Login;
