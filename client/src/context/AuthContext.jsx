import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure Axios Defaults
axios.defaults.baseURL = `${import.meta.env.VITE_API_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load user details on startup only once
  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const res = await axios.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Error fetching profile on startup:', err);
          setToken('');
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  // E-commerce Cart State
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const addToCart = (med) => {
    setCart(prev => {
      const exists = prev.find(item => item._id === med._id || item.id === med.id);
      if (exists) {
        return prev.map(item => 
          (item._id === med._id || item.id === med.id)
            ? { ...item, quantity: Math.min(med.stock, item.quantity + 1) }
            : item
        );
      }
      return [...prev, { ...med, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id && item.id !== id));
  };

  const updateCartQty = (id, qty) => {
    setCart(prev => prev.map(item => 
      (item._id === id || item.id === id)
        ? { ...item, quantity: Math.min(item.stock, Math.max(1, qty)) }
        : item
    ));
  };

  const clearCart = () => setCart([]);

  // Login method
  const login = async (email, password) => {
    setError('');
    try {
      const res = await axios.post('/auth/login', { email, password });
      if (res.data.success) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        setToken(res.data.token);
        setUser(res.data.user);
        
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Register method
  const register = async (userData) => {
    setError('');
    try {
      const res = await axios.post('/auth/register', userData);
      if (res.data.success) {
        if (res.data.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          
          setToken(res.data.token);
          setUser(res.data.user);
        }
        return { success: true, message: res.data.message, user: res.data.user };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Logout method
  const logout = () => {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setToken('');
    setUser(null);
    setCart([]);
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, error, login, register, logout, setError,
      cart, addToCart, removeFromCart, updateCartQty, clearCart,
      darkMode, setDarkMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
