import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Phone, User, Building2, UserPlus, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input } from '../components/ui';
import { cn } from '../lib/cn.js';

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold tracking-wider uppercase text-subtle">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

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
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setSubmitting(true);
      // Backend route: POST /api/auth/register
      // We reuse AuthContext.login to store user/token after registration.
      const response = await register(form);
      if (response?.user) navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Inscription impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleChip = (active) =>
    cn(
      'flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors',
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-border text-muted hover:border-border-strong hover:text-fg',
    );

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
          Créer votre compte
        </h1>
        <p className="mt-2 text-sm text-muted">
          Rejoignez KMER Event pour réserver vos billets — ou vendre les vôtres.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nom">
              <Input
                type="text"
                icon={User}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="family-name"
                required
              />
            </FormField>
            <FormField label="Prénom">
              <Input
                type="text"
                icon={User}
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                autoComplete="given-name"
                required
              />
            </FormField>
          </div>

          <FormField label="Téléphone">
            <Input
              type="tel"
              icon={Phone}
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="6XX XX XX XX"
              autoComplete="tel"
              required
            />
          </FormField>

          <FormField label="E-mail">
            <Input
              type="email"
              icon={Mail}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
            />
          </FormField>

          <fieldset>
            <legend className="text-xs font-bold tracking-wider uppercase text-subtle">
              Je suis…
            </legend>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: 'user' }))}
                aria-pressed={form.role === 'user'}
                className={roleChip(form.role === 'user')}
              >
                Spectateur
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: 'organizer' }))}
                aria-pressed={form.role === 'organizer'}
                className={roleChip(form.role === 'organizer')}
              >
                Organisateur
              </button>
            </div>
          </fieldset>

          {form.role === 'organizer' ? (
            <FormField label="Nom de l’organisation">
              <Input
                type="text"
                icon={Building2}
                value={form.organization_name}
                onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
                placeholder="Ex. Kmer Prod"
                required
              />
            </FormField>
          ) : null}

          <FormField label="Mot de passe">
            <Input
              type="password"
              icon={Lock}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </FormField>

          {error ? (
            <p className="px-4 py-3 text-sm border rounded-xl border-danger/30 bg-danger/10 text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
            <UserPlus className="w-4 h-4" />
            {submitting ? 'Création…' : 'Créer mon compte'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-center text-muted">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default Register;
