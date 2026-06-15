import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { normalizeAuthUser } from '../utils/authUser';

const AuthContext = createContext();
let authBootstrapPromise = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const persistSession = useCallback((tokenData, userData) => {
    localStorage.setItem('accessToken', tokenData.access_token);
    localStorage.setItem('refreshToken', tokenData.refresh_token);
    const normalized = normalizeAuthUser(userData);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    setIsAuthenticated(true);
    return normalized;
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        if (!authBootstrapPromise) {
          authBootstrapPromise = authAPI.getCurrentUser().finally(() => {
            authBootstrapPromise = null;
          });
        }
        const { data } = await authBootstrapPromise;
        persistSession(
          {
            access_token: token,
            refresh_token: localStorage.getItem('refreshToken') || '',
          },
          data,
        );
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [persistSession, clearSession]);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    localStorage.setItem('accessToken', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);
    const userResponse = await authAPI.getCurrentUser();
    return persistSession(response.data, userResponse.data);
  };

  const register = async (registerData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(registerData);
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      const userResponse = await authAPI.getCurrentUser();
      return persistSession(response.data, userResponse.data);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch {
      try {
        await authAPI.logoutAll();
      } catch {
        // Still clear local session
      }
    }
    clearSession();
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
