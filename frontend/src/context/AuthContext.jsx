import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi } from '../services/api.js';
import { reconnectSocket } from '../lib/socket.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kmer-user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('kmer-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kmer-user');
    }
  }, [user]);

  const login = async (credentials) => {
    const data = await loginApi(credentials);
    setUser(data.user);
    localStorage.setItem('kmer-token', data.token);
    // Re-open the realtime connection so presence reflects the logged-in user.
    reconnectSocket();
    return data;
  };

  const register = async (payload) => {
    // backend returns { user, token }
    const data = await (await import('../services/api.js')).register(payload);
    setUser(data.user);
    localStorage.setItem('kmer-token', data.token);
    reconnectSocket();
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kmer-token');
    // Drop the authenticated handshake; reconnect as an anonymous guest.
    reconnectSocket();
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
