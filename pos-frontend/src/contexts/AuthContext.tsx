/*
 * MAPA DEL ARCHIVO: CONTEXTO FRONTEND
 * UBICACION: pos-frontend/src/contexts/AuthContext.tsx
 * QUE HACE: Estado global compartido con React Context.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginData } from '../types';
import { getCurrentUser, login as apiLogin, loginWithGoogle as apiLoginWithGoogle } from '../services/api';

type LoginResult = { ok: boolean; message?: string; user?: User };

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginData) => Promise<LoginResult>;
  loginGoogle?: (credential: string) => Promise<LoginResult>;
  logout: () => void;
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: false,
  login: async () => ({ ok: false }),
  logout: () => {},
  user: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      try {
        setUser(JSON.parse(userData) as User);
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const persistAuthenticatedUser = (authenticatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    setIsAuthenticated(true);
    setUser(authenticatedUser);
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const refreshAuthenticatedUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const freshUser = await getCurrentUser(token);
        persistAuthenticatedUser(freshUser);
      } catch (error: any) {
        const status = error?.response?.status;
        if ([401, 403, 404].includes(status)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };

    void refreshAuthenticatedUser();
    const intervalId = window.setInterval(refreshAuthenticatedUser, 5000);
    window.addEventListener('focus', refreshAuthenticatedUser);
    document.addEventListener('visibilitychange', refreshAuthenticatedUser);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshAuthenticatedUser);
      document.removeEventListener('visibilitychange', refreshAuthenticatedUser);
    };
  }, [isAuthenticated]);

  const login = async (credentials: LoginData) => {
    try {
      const { user } = await apiLogin(credentials);
      persistAuthenticatedUser(user);
      return { ok: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      return { ok: false, message };
    }
  };

  const loginGoogle = async (credential: string) => {
    try {
      const { user } = await apiLoginWithGoogle(credential);
      persistAuthenticatedUser(user);
      return { ok: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
      return { ok: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, loginGoogle, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
