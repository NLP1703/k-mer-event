import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Camera,
  Trash2,
  KeyRound,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchMyFullProfile,
  changePassword as changePasswordApi,
  updateProfilePicture as updateProfilePictureApi,
} from '../services/api.js';
import { Button, Card, Input, Label, Badge, Avatar, Skeleton } from '../components/ui';

function FieldRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-4 border rounded-xl border-border bg-bg">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-hover text-muted">
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
        <p className="text-sm font-medium truncate text-fg">{value || '—'}</p>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={8}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Masquer' : 'Afficher'}
          className="absolute -translate-y-1/2 right-3 top-1/2 text-subtle hover:text-fg"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Profile picture state
  const [pictureUrl, setPictureUrl] = useState('');
  const [picSubmitting, setPicSubmitting] = useState(false);
  const [picMessage, setPicMessage] = useState('');
  const [picError, setPicError] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMyFullProfile();
        if (isMounted) {
          setProfile(data.user || null);
          setPictureUrl(data.user?.profile_picture || '');
        }
      } catch (e) {
        if (isMounted) setError(e?.response?.data?.message || 'Impossible de charger votre profil');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdMessage('');
    setPwdError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Tous les champs sont requis');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    try {
      setPwdSubmitting(true);
      const data = await changePasswordApi({ currentPassword, newPassword, confirmPassword });
      setPwdMessage(data?.message || 'Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.[0]?.msg ||
        'Échec de la modification du mot de passe';
      setPwdError(msg);
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handlePictureSubmit = async (e) => {
    e.preventDefault();
    setPicMessage('');
    setPicError('');
    try {
      setPicSubmitting(true);
      const data = await updateProfilePictureApi(pictureUrl?.trim() || null);
      setPicMessage(data?.message || 'Photo mise à jour');
      setProfile((prev) => ({ ...(prev || {}), profile_picture: data?.user?.profile_picture ?? null }));
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.[0]?.msg ||
        'Échec de la mise à jour de la photo';
      setPicError(msg);
    } finally {
      setPicSubmitting(false);
    }
  };

  const handlePictureRemove = async () => {
    setPicMessage('');
    setPicError('');
    try {
      setPicSubmitting(true);
      const data = await updateProfilePictureApi(null);
      setPicMessage(data?.message || 'Photo supprimée');
      setPictureUrl('');
      setProfile((prev) => ({ ...(prev || {}), profile_picture: null }));
    } catch (e) {
      setPicError(e?.response?.data?.message || 'Échec de la suppression');
    } finally {
      setPicSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-10 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-danger" />
        <p className="mt-4 text-fg">{error}</p>
      </Card>
    );
  }

  const previewUrl = pictureUrl?.trim() || profile?.profile_picture || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Profile header */}
      <Card className="p-6 md:p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <Avatar
            src={profile?.profile_picture}
            name={profile?.name}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-fg md:text-3xl">
                {profile?.name}
              </h1>
              <Badge variant="primary" size="sm">
                <Shield className="w-3 h-3" />
                {profile?.role || 'user'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{profile?.email}</p>
          </div>
        </div>

        <div className="grid gap-3 mt-6 md:grid-cols-3">
          <FieldRow icon={Mail} label="Email" value={profile?.email} />
          <FieldRow icon={Phone} label="Téléphone" value={profile?.telephone} />
          <FieldRow icon={Shield} label="Rôle" value={profile?.role} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile picture */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-fg">Photo de profil</h2>
              <p className="text-xs text-muted">
                Collez une URL d’image (https://…) ou un chemin /uploads/…
              </p>
            </div>
          </div>

          <form onSubmit={handlePictureSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-picture-url">URL de l’image</Label>
              <Input
                id="profile-picture-url"
                type="url"
                value={pictureUrl}
                onChange={(e) => setPictureUrl(e.target.value)}
                placeholder="https://exemple.com/photo.jpg"
                maxLength={1000}
              />
            </div>

            {previewUrl ? (
              <div className="flex items-center gap-4">
                <div className="overflow-hidden border w-28 h-28 rounded-xl border-border bg-surface-hover">
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs text-muted">Aperçu</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" size="md" disabled={picSubmitting}>
                {picSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              {profile?.profile_picture ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handlePictureRemove}
                  disabled={picSubmitting}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              ) : null}
            </div>

            {picMessage ? (
              <p className="flex items-start gap-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                {picMessage}
              </p>
            ) : null}
            {picError ? (
              <p className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                {picError}
              </p>
            ) : null}
          </form>
        </Card>

        {/* Password change */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-fg">Modifier mon mot de passe</h2>
              <p className="text-xs text-muted">Au moins 8 caractères</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <PasswordField
              id="current-password"
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-password"
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-password"
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            <Button type="submit" variant="primary" size="md" disabled={pwdSubmitting}>
              {pwdSubmitting ? 'Modification…' : 'Modifier le mot de passe'}
            </Button>

            {pwdMessage ? (
              <p className="flex items-start gap-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                {pwdMessage}
              </p>
            ) : null}
            {pwdError ? (
              <p className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                {pwdError}
              </p>
            ) : null}
          </form>
        </Card>
      </div>
    </motion.div>
  );
}

export default Profile;
