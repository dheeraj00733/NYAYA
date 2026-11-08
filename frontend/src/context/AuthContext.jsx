import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nyayaflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('nyayaflow_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('nyayaflow_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('nyayaflow_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('[Auth Initialization]: Token expired or invalid', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('nyayaflow_token', res.token);
      localStorage.setItem('nyayaflow_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('nyayaflow_token', res.token);
      localStorage.setItem('nyayaflow_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nyayaflow_token');
    localStorage.removeItem('nyayaflow_user');
  };

  const updateUserProfile = async (data) => {
    const res = await api.updateProfile(data);
    if (res.success && res.user) {
      setUser(prev => ({ ...prev, ...res.user }));
      localStorage.setItem('nyayaflow_user', JSON.stringify({ ...user, ...res.user }));
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
