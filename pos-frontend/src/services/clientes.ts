import axios from 'axios';
import { Cliente, ClienteLoginData, Venta } from '../types';
import { getAdminToken, getClienteToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
export const CLIENTES_API_URL = API_URL;

const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const resolveClienteAuthToken = () => getClienteToken() ?? getAdminToken();

export const checkClientesHealth = async (): Promise<boolean> => {
  try {
    const res = await axios.get(`${API_URL}/clientes/health`, { timeout: 4000 });
    return !!res?.data?.status;
  } catch {
    return false;
  }
};

export type ClienteRegisterPayload = {
  nombreCompleto: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
};

export const registerCliente = async (payload: ClienteRegisterPayload): Promise<{ token: string; cliente: Cliente }> => {
  try {
    const res = await axios.post(`${API_URL}/clientes/register`, payload);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Endpoint no encontrado. ¿Backend actualizado y reiniciado? -> ${API_URL}/clientes/register`);
      }
      const message =
        error.response?.data?.message ||
        error.message ||
        `Error al registrar cliente (${error.response?.status || 'sin respuesta'})`;
      throw new Error(`${message} -> ${API_URL}/clientes/register`);
    }
    throw error;
  }
};

export const registerClienteWithGoogle = async (credential: string): Promise<{ token: string; cliente: Cliente }> => {
  try {
    const res = await axios.post(`${API_URL}/clientes/google`, { credential });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Endpoint no encontrado. ¿Backend actualizado y reiniciado? -> ${API_URL}/clientes/google`);
      }
      const message =
        error.response?.data?.message ||
        error.message ||
        `Error al registrar con Google (${error.response?.status || 'sin respuesta'})`;
      throw new Error(`${message} -> ${API_URL}/clientes/google`);
    }
    throw error;
  }
};

export const loginCliente = async (payload: ClienteLoginData): Promise<{ token: string; cliente: Cliente }> => {
  try {
    const res = await axios.post(`${API_URL}/clientes/login`, payload);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Endpoint no encontrado. ¿Backend actualizado y reiniciado? -> ${API_URL}/clientes/login`);
      }
      const message =
        error.response?.data?.message ||
        error.message ||
        `Error al iniciar sesión (${error.response?.status || 'sin respuesta'})`;
      throw new Error(`${message} -> ${API_URL}/clientes/login`);
    }
    throw error;
  }
};

export const getPedidosCliente = async (clienteId: number): Promise<Venta[]> => {
  try {
    const res = await axios.get(`${API_URL}/ventas/cliente/${clienteId}`, {
      headers: buildAuthHeaders(resolveClienteAuthToken())
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        `Error al cargar pedidos (${error.response?.status || 'sin respuesta'})`;
      throw new Error(`${message} -> ${API_URL}/ventas/cliente/${clienteId}`);
    }
    throw error;
  }
};

export const updateCliente = async (
  id: number,
  payload: {
    nombreCompleto?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    ubicacionLat?: number | null;
    ubicacionLng?: number | null;
  }
): Promise<{ cliente: Cliente }> => {
  try {
    const res = await axios.put(`${API_URL}/clientes/${id}`, payload, {
      headers: buildAuthHeaders(resolveClienteAuthToken())
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        `Error al actualizar perfil (${error.response?.status || 'sin respuesta'})`;
      throw new Error(`${message} -> ${API_URL}/clientes/${id}`);
    }
    throw error;
  }
};
