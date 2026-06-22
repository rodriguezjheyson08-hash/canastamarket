/*
 * MAPA DEL ARCHIVO: CONTEXTO FRONTEND
 * UBICACION: pos-frontend/src/contexts/AuthContext.tsx
 * QUE HACE: Estado global compartido con React Context.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginData } from '../types';
import { login as apiLogin, loginWithGoogle as apiLoginWithGoogle } from '../services/api';

// TIPOS FRONTEND: alias LoginResult para ordenar datos internos.
type LoginResult = { ok: boolean; message?: string; user?: User };

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginData) => Promise<LoginResult>;
  loginWithGoogle: (credential: string) => Promise<LoginResult>;
  logout: () => void;
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: false,
  login: async () => ({ ok: false }),
  loginWithGoogle: async () => ({ ok: false }),
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

// LOGICA: persist Authenticated User concentra una operacion de este archivo.
  const persistAuthenticatedUser = (authenticatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    setIsAuthenticated(true);
    setUser(authenticatedUser);
  };

// LOGICA: login concentra una operacion de este archivo.
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

// LOGICA: login With Google concentra una operacion de este archivo.
  const loginWithGoogle = async (credential: string) => {
    try {
      const { user } = await apiLoginWithGoogle(credential);
      persistAuthenticatedUser(user);
      return { ok: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Continúa con un correo válido.';
      return { ok: false, message };
    }
  };

// LOGICA: logout concentra una operacion de este archivo.
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, loginWithGoogle, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

// CONTEXTO FRONTEND: bloque use Auth.
export const useAuth = () => useContext(AuthContext); 
