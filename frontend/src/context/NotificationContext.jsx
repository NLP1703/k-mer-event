import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead as markReadApi,
  markAllNotificationsRead as markAllReadApi,
} from '../services/api.js';
import { socket } from '../lib/socket.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
      setUnread(Number(data.unread) || 0);
    } catch {
      /* non-blocking: the bell just stays empty */
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on login / user change.
  useEffect(() => {
    load();
  }, [load]);

  // Live push: prepend new notifications arriving over the socket.
  useEffect(() => {
    if (!user) return undefined;
    const onNew = (notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      setUnread((prev) => prev + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [user]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await markReadApi(id);
    } catch {
      /* optimistic; a later reload reconciles */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    try {
      await markAllReadApi();
    } catch {
      /* optimistic */
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unread, loading, reload: load, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
