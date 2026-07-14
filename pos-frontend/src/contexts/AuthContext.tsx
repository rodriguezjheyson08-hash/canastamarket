/*
 * MAPA DEL ARCHIVO: CONTEXTO FRONTEND
 * UBICACION: pos-frontend/src/contexts/AuthContext.tsx
 * QUE HACE: Estado global compartido con React Context.
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, LoginData } from '../types';
import { getCurrentUser, login as apiLogin, loginWithGoogle as apiLoginWithGoogle } from '../services/api';
import {
  AUTH_BROADCAST_CHANNEL,
  AUTH_LOGOUT_EVENT_KEY,
  AUTH_SESSION_CHANGED_EVENT,
  clearStaffSession,
  forceStaffLoginRedirect,
  notifyStaffLogout
} from '../utils/staffSessionSync';

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
  const tokenSnapshotRef = useRef<string | null>(null);

  const clearAuthenticatedUser = (notifyOtherTabs = false) => {
    clearStaffSession();
    tokenSnapshotRef.current = null;
    setIsAuthenticated(false);
    setUser(null);
    forceStaffLoginRedirect();
    if (notifyOtherTabs) notifyStaffLogout();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      tokenSnapshotRef.current = token;
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
    const token = localStorage.getItem('token');
    if (!token) {
      clearAuthenticatedUser(false);
      return;
    }
    tokenSnapshotRef.current = token;
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    setIsAuthenticated(true);
    setUser(authenticatedUser);
  };

  const syncSessionFromStorage = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      if (isAuthenticated || user) clearAuthenticatedUser(false);
      return;
    }

    if (tokenSnapshotRef.current === token && isAuthenticated && user) return;

    try {
      tokenSnapshotRef.current = token;
      setUser(JSON.parse(userData) as User);
      setIsAuthenticated(true);
    } catch {
      clearAuthenticatedUser(true);
    }
  };

  useEffect(() => {
    const handleAuthStorageChange = (event: StorageEvent) => {
      if (!['token', 'user', AUTH_LOGOUT_EVENT_KEY].includes(event.key || '')) return;
      syncSessionFromStorage();
    };
    const handleAuthSessionChanged = () => syncSessionFromStorage();

    window.addEventListener('storage', handleAuthStorageChange);
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChanged);
    return () => {
      window.removeEventListener('storage', handleAuthStorageChange);
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChanged);
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const intervalId = window.setInterval(syncSessionFromStorage, 1000);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return undefined;
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === 'logout') {
        clearAuthenticatedUser(false);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const refreshAuthenticatedUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        clearAuthenticatedUser(false);
        return;
      }
      try {
        const freshUser = await getCurrentUser(token);
        if (localStorage.getItem('token') !== token) return;
        persistAuthenticatedUser(freshUser);
      } catch (error: any) {
        const status = error?.response?.status;
        if ([401, 403, 404].includes(status)) {
          clearAuthenticatedUser(true);
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
    clearAuthenticatedUser(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, loginGoogle, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
