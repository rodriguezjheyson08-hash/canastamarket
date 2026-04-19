import axios from 'axios';
import { Venta } from '../types';
import { getAdminToken, getClienteToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export type PedidoEstado = 'pendiente' | 'creando' | 'en_camino' | 'entregado' | 'rechazado';

export const getPedidos = async (estado?: PedidoEstado): Promise<Venta[]> => {
  const params = estado ? { estado } : undefined;
  const token = getAdminToken();
  try {
    const res = await axios.get(`${API_URL}/pedidos`, {
      params,
      headers: buildAuthHeaders(token)
    });
    return res.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Fallback (si el backend expone pedidos bajo /ventas/pedidos)
      try {
        const res2 = await axios.get(`${API_URL}/ventas/pedidos`, {
          params,
          headers: buildAuthHeaders(token)
        });
        return res2.data;
      } catch (error2: any) {
        if (axios.isAxiosError(error2)) {
          const message = error2.response?.data?.message || error2.message || 'Error al cargar pedidos';
          throw new Error(`${message} -> ${API_URL}/pedidos (y fallback ${API_URL}/ventas/pedidos)`);
        }
        throw error2;
      }
    }
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'Error al cargar pedidos';
      throw new Error(`${message} -> ${API_URL}/pedidos`);
    }
    throw error;
  }
};

export const updatePedidoEstado = async (
  ventaId: number,
  estado: PedidoEstado,
  motivo?: string,
  token?: string | null
): Promise<Venta> => {
  const authToken = token ?? getAdminToken();
  try {
    const res = await axios.put(
      `${API_URL}/pedidos/${ventaId}/estado`,
      { estado, motivo },
      { headers: buildAuthHeaders(authToken) }
    );
    return res.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      try {
        const res2 = await axios.put(
          `${API_URL}/ventas/pedidos/${ventaId}/estado`,
          { estado, motivo },
          { headers: buildAuthHeaders(authToken) }
        );
        return res2.data;
      } catch (error2: any) {
        if (axios.isAxiosError(error2)) {
          const message = error2.response?.data?.message || error2.message || 'Error al actualizar pedido';
          throw new Error(
            `${message} -> ${API_URL}/pedidos/${ventaId}/estado (y fallback ${API_URL}/ventas/pedidos/${ventaId}/estado)`
          );
        }
        throw error2;
      }
    }
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'Error al actualizar pedido';
      throw new Error(`${message} -> ${API_URL}/pedidos/${ventaId}/estado`);
    }
    throw error;
  }
};

export const cancelPedidoCliente = async (ventaId: number): Promise<Venta> => {
  return updatePedidoEstado(ventaId, 'rechazado', 'Cancelado por cliente', getClienteToken() ?? getAdminToken());
};
