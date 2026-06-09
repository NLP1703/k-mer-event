import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Sparkles,
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
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { Button, Container, Avatar, ThemeToggle } from './ui';
import { cn } from '../lib/cn.js';

const linkBase =
  'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted hover:text-fg hover:bg-surface-hover';

const linkActive = 'text-fg bg-surface-hover';

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

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { items } = useCart();
  const cartCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
      <NavItem to="/" icon={Compass} onClick={onClick}>Discover</NavItem>
      {!isAdmin ? <NavItem to="/bookings" icon={Ticket} onClick={onClick}>Mes billets</NavItem> : null}
      {!isAdmin ? (
        <NavItem to="/cart" icon={ShoppingBag} onClick={onClick}>
          Cart{cartCount ? ` (${cartCount})` : ''}
        </NavItem>
      ) : null}
      {isAdmin ? <NavItem to="/admin/events" icon={CalendarCheck} onClick={onClick}>Événements</NavItem> : null}
      {isOrganizer ? <NavItem to="/admin/events" icon={IdCard} onClick={onClick}>Mes événements</NavItem> : null}
      {isOrganizer ? <NavItem to="/organizer/statistics" icon={BarChart3} onClick={onClick}>Statistiques</NavItem> : null}
      {(isAdmin || isOrganizer) ? <NavItem to="/checkin" icon={ScanLine} onClick={onClick}>Check-in</NavItem> : null}
      {isAdmin ? <NavItem to="/admin/users" icon={Users} onClick={onClick}>Utilisateurs</NavItem> : null}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen text-fg bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
        <Container className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="K-MER Events">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-fg">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-base text-fg">
              K-MER <span className="text-muted">Events</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="items-center hidden gap-1 lg:flex">
            <NavLinks />
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
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

      {/* Mobile drawer */}
      {isMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-bg-elevated border-l border-border shadow-elevated lg:hidden animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between h-16 px-5 border-b border-border">
              <span className="text-sm font-semibold text-fg">Menu</span>
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
          </div>
        </>
      ) : null}

      <main className="flex-1">
        <Container className="py-8 lg:py-12">
          <Outlet />
        </Container>
      </main>

      <footer className="border-t border-border bg-bg-elevated">
        <Container className="flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-fg">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">K-MER Events</p>
              <p className="text-xs text-muted">Réservation d’événements premium au Cameroun</p>
            </div>
          </div>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} K-MER Events · Tous droits réservés
          </p>
        </Container>
      </footer>
    </div>
  );
}

export default Layout;
