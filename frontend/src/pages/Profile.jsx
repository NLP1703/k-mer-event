import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Camera,
  KeyRound,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchMyFullProfile,
  changePassword as changePasswordApi,
  updateProfilePicture as updateProfilePictureApi,
  updateMyProfile as updateMyProfileApi,
  deleteMyAccount as deleteMyAccountApi,
} from '../services/api.js';
import ImageUploader from '../components/ImageUploader.jsx';
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
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editable identity fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [infoSubmitting, setInfoSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [infoError, setInfoError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Profile picture state
  const [picSubmitting, setPicSubmitting] = useState(false);
  const [picMessage, setPicMessage] = useState('');
  const [picError, setPicError] = useState('');

  // Account deletion state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMyFullProfile();
        if (isMounted) {
          const u = data.user || null;
          setProfile(u);
          setName(u?.name || '');
          setEmail(u?.email || '');
          setTelephone(u?.telephone || '');
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

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setInfoMessage('');
    setInfoError('');
    if (!name.trim() || !email.trim()) {
      setInfoError('Le nom et l’email sont requis');
      return;
    }
    try {
      setInfoSubmitting(true);
      const data = await updateMyProfileApi({
        name: name.trim(),
        email: email.trim(),
        telephone: telephone.trim() || null,
      });
      const updated = data?.user || {};
      setProfile((prev) => ({ ...(prev || {}), ...updated }));
      updateUser({ name: updated.name, email: updated.email });
      setInfoMessage(data?.message || 'Profil mis à jour');
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.[0]?.msg ||
        'Échec de la mise à jour du profil';
      setInfoError(msg);
    } finally {
      setInfoSubmitting(false);
    }
  };

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

  // Called by ImageUploader once a file is picked from the device gallery and
  // uploaded (url is the served /uploads/... path, or '' when removed).
  const handlePictureChange = async (url) => {
    setPicMessage('');
    setPicError('');
    try {
      setPicSubmitting(true);
      const data = await updateProfilePictureApi(url?.trim() || null);
      const nextPic = data?.user?.profile_picture ?? null;
      setProfile((prev) => ({ ...(prev || {}), profile_picture: nextPic }));
      updateUser({ profile_picture: nextPic });
      setPicMessage(nextPic ? 'Photo mise à jour' : 'Photo supprimée');
    } catch (e) {
      setPicError(e?.response?.data?.message || 'Échec de la mise à jour de la photo');
    } finally {
      setPicSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    try {
      setDeleting(true);
      await deleteMyAccountApi();
      // Clears the in-memory access token + cached user; the guard below then
      // redirects to /login on the next render.
      await logout();
    } catch (e) {
      setDeleteError(e?.response?.data?.message || 'Échec de la suppression du compte');
      setDeleting(false);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Profile header */}
      <Card className="p-6 md:p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <Avatar src={profile?.profile_picture} name={profile?.name} size="xl" />
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
                Choisissez une image depuis votre galerie
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <ImageUploader
              value={profile?.profile_picture || ''}
              onChange={handlePictureChange}
            />

            {picSubmitting ? (
              <p className="text-sm text-muted">Enregistrement…</p>
            ) : null}
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
          </div>
        </Card>

        {/* Edit personal info */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <UserIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-fg">Mes informations</h2>
              <p className="text-xs text-muted">Modifiez votre nom, email et téléphone</p>
            </div>
          </div>

          <form onSubmit={handleInfoSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nom</Label>
              <Input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-telephone">Téléphone</Label>
              <Input
                id="profile-telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                maxLength={30}
                placeholder="+237…"
                autoComplete="tel"
              />
            </div>

            <Button type="submit" variant="primary" size="md" disabled={infoSubmitting}>
              {infoSubmitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Button>

            {infoMessage ? (
              <p className="flex items-start gap-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                {infoMessage}
              </p>
            ) : null}
            {infoError ? (
              <p className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                {infoError}
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

        {/* Danger zone: delete account */}
        <Card className="p-6 border-danger/40 md:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-danger/10 text-danger">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-fg">Supprimer mon compte</h2>
              <p className="text-xs text-muted">Cette action est définitive</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              La suppression désactive définitivement votre compte et vous déconnecte.
              Vos réservations passées sont conservées pour l’historique, mais vous ne
              pourrez plus vous reconnecter avec cet email.
            </p>

            {confirmDelete ? (
              <div className="p-4 space-y-3 border rounded-xl border-danger/40 bg-danger/5">
                <p className="text-sm font-medium text-fg">
                  Êtes-vous sûr ? Cette action ne peut pas être annulée.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Suppression…' : 'Oui, supprimer définitivement'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={() => setConfirmDelete(true)}
              >
                Supprimer mon compte
              </Button>
            )}

            {deleteError ? (
              <p className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                {deleteError}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

export default Profile;
