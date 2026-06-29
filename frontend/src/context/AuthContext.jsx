import { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  refreshSession,
} from '../services/api.js';
import { reconnectSocket } from '../lib/socket.js';
import { syncFavoritesWithServer } from '../lib/favorites.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // `user` is cached in localStorage purely for instant UI hydration — it holds
  // NO secret (the access token lives in memory, the refresh token in an
  // HttpOnly cookie). The session itself is re-established via /auth/refresh.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kmer-user');
    return stored ? JSON.parse(stored) : null;
  });
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (user) {
      localStorage.setItem('kmer-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kmer-user');
    }
  }, [user]);

  // On first load, silently exchange the refresh cookie for a fresh access
  // token so the session survives a page reload without persisting any secret.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refreshSession();
        if (!cancelled) {
          setUser(data.user);
          reconnectSocket();
          syncFavoritesWithServer();
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    const data = await loginApi(credentials);
    setUser(data.user);
    reconnectSocket();
    syncFavoritesWithServer();
    return data;
  };

  const register = async (payload) => {
    const data = await registerApi(payload);
    setUser(data.user);
    reconnectSocket();
    syncFavoritesWithServer();
    return data;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    reconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, bootstrapping }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
