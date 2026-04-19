import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Cliente, ClienteLoginData } from '../types';
import { loginCliente } from '../services/clientes';
import { safeParseJson } from '../utils/json';

type ClienteAuthContextType = {
  loading: boolean;
  isAuthenticated: boolean;
  cliente: Cliente | null;
  setCliente: (cliente: Cliente | null, token?: string | null) => void;
  login: (data: ClienteLoginData) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
};

const STORAGE_CLIENTE = 'cliente';
const STORAGE_TOKEN = 'cliente_token';

const ClienteAuthContext = createContext<ClienteAuthContextType>({
  loading: false,
  isAuthenticated: false,
  cliente: null,
  setCliente: () => {},
  login: async () => ({ ok: false }),
  logout: () => {}
});

export const ClienteAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [cliente, setClienteState] = useState<Cliente | null>(null);

  useEffect(() => {
    const rawCliente = safeParseJson<Cliente>(localStorage.getItem(STORAGE_CLIENTE));
    if (rawCliente?.id && rawCliente?.email) {
      setClienteState(rawCliente);
    }
    setLoading(false);
  }, []);

  const setCliente = (next: Cliente | null, token?: string | null) => {
    if (!next) {
      localStorage.removeItem(STORAGE_CLIENTE);
      localStorage.removeItem(STORAGE_TOKEN);
      setClienteState(null);
      return;
    }
    localStorage.setItem(STORAGE_CLIENTE, JSON.stringify(next));
    if (typeof token === 'string' && token.trim()) {
      localStorage.setItem(STORAGE_TOKEN, token.trim());
    } else if (!localStorage.getItem(STORAGE_TOKEN)) {
      localStorage.removeItem(STORAGE_TOKEN);
    }
    setClienteState(next);
  };

  const login = async (data: ClienteLoginData) => {
    try {
      const res = await loginCliente(data);
      setCliente(res.cliente, res.token);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      return { ok: false, message };
    }
  };

  const logout = () => {
    setCliente(null);
  };

  const value = useMemo<ClienteAuthContextType>(
    () => ({
      loading,
      isAuthenticated: !!cliente,
      cliente,
      setCliente,
      login,
      logout
    }),
    [loading, cliente]
  );

  return <ClienteAuthContext.Provider value={value}>{children}</ClienteAuthContext.Provider>;
};

export const useClienteAuth = () => useContext(ClienteAuthContext);
