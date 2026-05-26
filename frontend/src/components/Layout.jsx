import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
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
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


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

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  return (
    <div className="min-h-screen text-white bg-night">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
          {/* Mobile: Menu à gauche - proportionnel */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="inline-flex items-center flex-shrink-0 gap-2 px-3 py-2 text-sm text-white transition border rounded-full border-white/10 bg-white/5 hover:border-neon hover:text-neon md:hidden"
          >
            {isMenuOpen ? <X className="flex-shrink-0 w-4 h-4" /> : <Menu className="flex-shrink-0 w-4 h-4" />} Menu
          </button>

          {/* Desktop navigation - centrée */}
          <nav className="items-center hidden gap-6 md:flex">
            <Link
              to="/"
              className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
            >
              <Compass className="w-4 h-4 text-neon" />
              Discover
            </Link>
            {user?.role !== 'admin' ? (
              <Link
                to="/bookings"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <Ticket className="w-4 h-4" />
                Bookings
              </Link>
            ) : null}
            {user ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <User className="w-4 h-4" />
                Mon profil
              </Link>
            ) : null}

            {user?.role !== 'admin' ? (
              <Link
                to="/cart"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <ShoppingBag className="w-4 h-4" />
                Cart{cartCount ? ` (${cartCount})` : ''}
              </Link>
            ) : null}
            {user?.role === 'admin' ? (
              <Link
                to="/admin/events"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <CalendarCheck className="w-4 h-4" />
                Voir les evenements
              </Link>
            ) : null}
            {user?.role === 'organizer' ? (
              <Link
                to="/admin/events"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <IdCard className="w-4 h-4" />
                Mon event manager
              </Link>
            ) : null}
            {user?.role === 'admin' ? (
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <Users className="w-4 h-4" />
                Voir les utilisateurs
              </Link>
            ) : null}

            {user ? (
              <button
                onClick={logout}
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-3 px-4 py-2 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            )}
          </nav>


          {/* Mobile & Desktop: Logo/nom à droite - proportionnel */}
          <Link
            to="/"
            className="flex items-center flex-shrink-0 gap-3 ml-auto text-lg font-semibold tracking-tight text-white"
            aria-label="K-MER Events home"
          >
            <Sparkles className="flex-shrink-0 w-6 h-6 text-neon" />
            <span className="hidden sm:inline">K-MER Events</span>
            <span className="sm:hidden">K-MER</span>
          </Link>
        </div>

        {isMenuOpen ? (
          <div className="relative z-50 md:hidden">
            <div className="px-6 pb-4 mx-auto max-w-7xl">
              <nav className="p-4 space-y-3 border rounded-3xl border-white/10 bg-black/60 backdrop-blur-xl">
                <Link
                  to="/"
                  onClick={closeMenu}
                  className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                >
                  <Compass className="flex-shrink-0 w-4 h-4 text-neon" />
                  Discover
                </Link>
                {user?.role !== 'admin' ? (
                  <Link
                    to="/bookings"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <Ticket className="flex-shrink-0 w-4 h-4" />
                    Bookings
                  </Link>
                ) : null}
                {user ? (
                  <Link
                    to="/profile"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <User className="flex-shrink-0 w-4 h-4" />
                    Mon profil
                  </Link>
                ) : null}

                {user?.role !== 'admin' ? (
                  <Link
                    to="/cart"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <ShoppingBag className="flex-shrink-0 w-4 h-4" />
                    Cart{cartCount ? ` (${cartCount})` : ''}
                  </Link>
                ) : null}
                {user?.role === 'admin' ? (
                  <Link
                    to="/admin/events"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <CalendarCheck className="flex-shrink-0 w-4 h-4" />
                    Voir les evenements
                  </Link>
                ) : null}
                {user?.role === 'organizer' ? (
                  <Link
                    to="/admin/events"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <IdCard className="flex-shrink-0 w-4 h-4" />
                    Mon event manager
                  </Link>
                ) : null}
                {user?.role === 'admin' ? (
                  <Link
                    to="/admin/users"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <Users className="flex-shrink-0 w-4 h-4" />
                    Voir les utilisateurs
                  </Link>
                ) : null}

                {user ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <LogOut className="flex-shrink-0 w-4 h-4" />
                    Logout
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="flex items-center w-full gap-3 px-4 py-3 text-sm text-center transition border rounded-lg border-white/10 bg-white/5 text-white/90 hover:border-neon hover:text-neon"
                  >
                    <LogIn className="flex-shrink-0 w-4 h-4" />
                    Login
                  </Link>
                )}

              </nav>
            </div>
          </div>

        ) : null}
      </header>

      <main className="px-6 py-10 mx-auto max-w-7xl">
        <Outlet />
      </main>

      <footer className="py-6 text-sm text-center border-t border-white/10 bg-black/20 text-white/60">
        Designed for premium ticketing experiences and Afro-futuristic event discovery.
      </footer>
    </div>
  );
}

export default Layout;

