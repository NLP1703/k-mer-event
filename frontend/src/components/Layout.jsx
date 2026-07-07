import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  ShoppingBag,
  X,
  Compass,
  Ticket,
  User,
  CalendarCheck,
  IdCard,
  Users,
  LogIn,
  LogOut,
  BarChart3,
  ScanLine,
  LayoutDashboard,
  Search,
  Heart,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { Button, Container, Avatar, ThemeToggle } from './ui';
import NotificationBell from './NotificationBell.jsx';
import { cn } from '../lib/cn.js';

const linkBase =
  'inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors text-muted hover:text-fg hover:bg-surface-hover';

const linkActive = 'text-primary bg-primary/10 hover:text-primary hover:bg-primary/10';

/* Marque : pastille dégradé + wordmark */
function Brand({ compact = false }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 font-display font-bold tracking-tight"
      aria-label="KMER Event — Accueil"
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] bg-grad-brand text-white shadow-glow">
        <Ticket className="w-4 h-4" />
      </span>
      {!compact && (
        <span className="text-base text-fg">
          KMER <span className="text-grad-brand">Event</span>
        </span>
      )}
    </Link>
  );
}

function NavItem({ to, icon: Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) => cn(linkBase, isActive && linkActive)}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      <span>{children}</span>
    </NavLink>
  );
}

/* ============ Navigation mobile inférieure ============ */
function BottomNavItem({ to, icon: Icon, label, badge, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold transition-colors',
          isActive ? 'text-primary' : 'text-subtle hover:text-muted',
        )
      }
    >
      <span className="relative">
        <Icon className="w-5 h-5" />
        {badge ? (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose text-white text-[9px] font-bold inline-flex items-center justify-center">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </NavLink>
  );
}

function BottomNav({ user, cartCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';

  const goToSearch = () => {
    const scroll = () =>
      document.getElementById('events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (location.pathname === '/') {
      scroll();
    } else {
      navigate('/');
      setTimeout(scroll, 350);
    }
  };

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-border bg-bg-elevated/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative grid grid-cols-5 h-16">
        <BottomNavItem to="/" icon={Compass} label="Découvrir" end />

        {isAdmin ? (
          <BottomNavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        ) : isOrganizer ? (
          <BottomNavItem to="/admin/events" icon={CalendarCheck} label="Événements" />
        ) : (
          <BottomNavItem to="/bookings" icon={Ticket} label="Billets" />
        )}

        {/* Action centrale flottante : recherche */}
        <div className="relative">
          <button
            type="button"
            onClick={goToSearch}
            aria-label="Rechercher un événement"
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-[52px] h-[52px] rounded-full bg-grad-brand text-white shadow-glow inline-flex items-center justify-center hover:brightness-110 transition"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {isAdmin ? (
          <BottomNavItem to="/admin/users" icon={Users} label="Utilisateurs" />
        ) : isOrganizer ? (
          <BottomNavItem to="/organizer/statistics" icon={BarChart3} label="Stats" />
        ) : (
          <BottomNavItem to="/cart" icon={ShoppingBag} label="Panier" badge={cartCount || null} />
        )}

        <BottomNavItem
          to={user ? '/profile' : '/login'}
          icon={User}
          label={user ? 'Profil' : 'Connexion'}
        />
      </div>
    </nav>
  );
}

/* ============ Footer ============ */
function FooterColumn({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-wider uppercase text-subtle">{title}</p>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="text-sm text-muted hover:text-primary transition-colors">
        {children}
      </Link>
    </li>
  );
}

function Footer({ user }) {
  const isOrganizer = user?.role === 'organizer';
  return (
    <footer className="border-t border-border bg-bg-elevated">
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3 max-w-xs">
            <Brand />
            <p className="text-sm leading-relaxed text-muted">
              La billetterie nouvelle génération au Cameroun. Réservez en 30 secondes,
              recevez votre billet QR instantanément.
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-subtle">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Fait avec passion au Cameroun
            </p>
          </div>

          <FooterColumn title="Découvrir">
            <FooterLink to="/">Tous les événements</FooterLink>
            <FooterLink to="/cart">Mon panier</FooterLink>
            {user ? <FooterLink to="/bookings">Mes billets</FooterLink> : null}
          </FooterColumn>

          <FooterColumn title="Compte">
            {user ? (
              <>
                <FooterLink to="/profile">Mon profil</FooterLink>
                <FooterLink to="/bookings">Historique</FooterLink>
              </>
            ) : (
              <>
                <FooterLink to="/login">Se connecter</FooterLink>
                <FooterLink to="/register">Créer un compte</FooterLink>
              </>
            )}
          </FooterColumn>

          <FooterColumn title="Organisateurs">
            {isOrganizer ? (
              <>
                <FooterLink to="/admin/events">Mes événements</FooterLink>
                <FooterLink to="/organizer/statistics">Statistiques</FooterLink>
                <FooterLink to="/checkin">Check-in</FooterLink>
              </>
            ) : (
              <FooterLink to={user ? '/profile' : '/register'}>Devenir organisateur</FooterLink>
            )}
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-3 pt-8 mt-10 border-t border-border sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle">
            © {new Date().getFullYear()} KMER Event · Tous droits réservés
          </p>
          <p className="text-xs text-subtle">Douala · Yaoundé · Bafoussam · Kribi</p>
        </div>
      </Container>
    </footer>
  );
}

/* ============ Layout ============ */
function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { items } = useCart();
  const cartCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Ombre de la navbar au défilement
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';

  const NavLinks = ({ onClick }) => (
    <>
      <NavItem to="/" icon={Compass} onClick={onClick}>Découvrir</NavItem>
      {!isAdmin ? <NavItem to="/bookings" icon={Ticket} onClick={onClick}>Mes billets</NavItem> : null}
      {!isAdmin ? (
        <NavItem to="/cart" icon={ShoppingBag} onClick={onClick}>
          Panier{cartCount ? ` (${cartCount})` : ''}
        </NavItem>
      ) : null}
      {isAdmin ? <NavItem to="/dashboard" icon={LayoutDashboard} onClick={onClick}>Tableau de bord</NavItem> : null}
      {isAdmin ? <NavItem to="/admin/events" icon={CalendarCheck} onClick={onClick}>Événements</NavItem> : null}
      {isOrganizer ? <NavItem to="/admin/events" icon={IdCard} onClick={onClick}>Mes événements</NavItem> : null}
      {isOrganizer ? <NavItem to="/organizer/statistics" icon={BarChart3} onClick={onClick}>Statistiques</NavItem> : null}
      {(isAdmin || isOrganizer) ? <NavItem to="/checkin" icon={ScanLine} onClick={onClick}>Check-in</NavItem> : null}
      {isAdmin ? <NavItem to="/admin/users" icon={Users} onClick={onClick}>Utilisateurs</NavItem> : null}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen text-fg bg-bg">
      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-bg/80 backdrop-blur-xl transition-shadow',
          scrolled ? 'border-border shadow-card' : 'border-transparent',
        )}
      >
        <Container className="flex items-center justify-between h-16 gap-4">
          <Brand />

          {/* Desktop nav */}
          <nav className="items-center hidden gap-1 lg:flex" aria-label="Navigation principale">
            <NavLinks />
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {user ? <NotificationBell /> : null}
            <ThemeToggle className="hidden sm:inline-flex" />

            {user ? (
              <div className="items-center hidden gap-2 lg:flex">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                  title="Mon profil"
                >
                  <Avatar src={user?.profile_picture} name={user?.name} size="sm" />
                  <span className="text-sm font-medium text-fg max-w-[120px] truncate">{user.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} title="Déconnexion">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" to="/login" className="hidden lg:inline-flex">
                <LogIn className="w-4 h-4" />
                Se connecter
              </Button>
            )}

            <button
              type="button"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg w-9 h-9 border border-border bg-surface text-fg hover:bg-surface-hover lg:hidden"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile drawer — liens secondaires */}
      <AnimatePresence>
        {isMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={closeMenu}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-bg-elevated border-l border-border shadow-elevated lg:hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between h-16 px-5 border-b border-border">
                <Brand compact />
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Fermer"
                  className="inline-flex items-center justify-center rounded-lg w-9 h-9 border border-border bg-surface text-fg hover:bg-surface-hover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-1">
                <NavLinks onClick={closeMenu} />
              </div>

              <div className="px-5 pt-2 border-t border-border">
                <div className="flex items-center justify-between py-3">
                  <span className="text-xs uppercase tracking-wide text-subtle">Thème</span>
                  <ThemeToggle />
                </div>

                {user ? (
                  <div className="space-y-2 pb-5">
                    <NavLink
                      to="/profile"
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 p-3 rounded-lg transition-colors',
                          isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                        )
                      }
                    >
                      <Avatar src={user?.profile_picture} name={user?.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-fg">{user.name}</p>
                        <p className="text-xs truncate text-muted">{user.email}</p>
                      </div>
                      <User className="w-4 h-4 text-subtle" />
                    </NavLink>
                    <Button variant="secondary" size="md" onClick={handleLogout} className="w-full">
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </Button>
                  </div>
                ) : (
                  <div className="pb-5">
                    <Button variant="primary" size="md" to="/login" onClick={closeMenu} className="w-full">
                      <LogIn className="w-4 h-4" />
                      Se connecter
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <main className="flex-1 pb-20 lg:pb-0">
        <Container className="py-8 lg:py-12">
          <Outlet />
        </Container>
      </main>

      <Footer user={user} />

      {/* Espace réservé à la barre mobile */}
      <div className="h-16 lg:hidden" aria-hidden="true" />

      <BottomNav user={user} cartCount={cartCount} />
    </div>
  );
}

export default Layout;
