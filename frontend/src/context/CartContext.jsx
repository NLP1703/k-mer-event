import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  fetchCart,
  addToCart as addToCartApi,
  removeCartItem as removeCartItemApi,
  clearCart as clearCartApi,
} from '../services/api.js';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCart = async () => {
    const token = localStorage.getItem('kmer-token');

    // Avoid protected `/cart` calls when not authenticated.
    if (!user || !token) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchCart();
      setItems(response.items || []);
    } catch (error) {
      console.error(error);

      // If token expired/invalid, backend will respond with 401.
      if (error?.response?.status === 401) {
        localStorage.removeItem('kmer-token');
        localStorage.removeItem('kmer-user');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // If token is removed (e.g., invalid/expired), ensure we don't keep a stale cart.
    if (!localStorage.getItem('kmer-token')) {
      setItems([]);
      setLoading(false);
    }
  }, []);


  const addToCart = async (eventId, quantity) => {
    if (!user) throw new Error('Login required');

    const response = await addToCartApi({ eventId, quantity });
    setItems(response.items || []);
  };

  const removeFromCart = async (eventId) => {
    const response = await removeCartItemApi(eventId);
    setItems(response.items || []);
  };

  const clearCart = async () => {
    await clearCartApi();
    setItems([]);
  };

  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.event.ticket_price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        cartTotal,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart: loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

