import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  fetchCart,
  addToCart as addToCartApi,
  removeCartItem as removeCartItemApi,
  clearCart as clearCartApi,
  getAccessToken,
} from '../services/api.js';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCart = useCallback(async () => {
    // Avoid protected `/cart` calls when not authenticated. The access token is
    // held in memory (set after login / silent refresh).
    if (!user || !getAccessToken()) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchCart();
      setItems(response.items || []);
    } catch (error) {
      // The API client auto-refreshes on 401; a remaining 401 means the session
      // is gone — just drop the local cart (AuthContext clears the user).
      if (error?.response?.status === 401) {
        setItems([]);
      } else {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);


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

