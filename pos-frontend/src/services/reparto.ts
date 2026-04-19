import axios from 'axios';
import { Repartidor } from '../types';
import { getAdminToken, getClienteToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const getRepartidores = async (): Promise<Repartidor[]> => {
  const res = await axios.get(`${API_URL}/repartidores`, {
    headers: buildAuthHeaders(getAdminToken())
  });
  return res.data;
};

export const assignRepartidorToPedido = async (
  ventaId: number,
  repartidorId: number
): Promise<{ ventaId: number; repartidorId: number | null; repartidorAsignadoAt: string | null }> => {
  const res = await axios.put(
    `${API_URL}/pedidos/${ventaId}/asignar`,
    { repartidorId },
    { headers: buildAuthHeaders(getAdminToken()) }
  );
  return res.data;
};

export type PedidoTrackingResponse = {
  venta: {
    id: number;
    pedidoEstado: string | null;
    pedidoUpdatedAt: string | null;
    direccionEntrega: string | null;
    ubicacionLat: number | null;
    ubicacionLng: number | null;
    repartidorId: number | null;
    repartidorAsignadoAt: string | null;
  };
  repartidor: null | {
    id: number;
    nombreCompleto: string | null;
    telefono: string | null;
    motoMatricula: string | null;
    estado: string | null;
    lastLat: number | null;
    lastLng: number | null;
    lastSeenAt: string | null;
  };
  last: null | { lat: number; lng: number; at: string };
  history: Array<{ lat: number; lng: number; at: string }>;
};

export const getPedidoTracking = async (ventaId: number, token?: string | null): Promise<PedidoTrackingResponse> => {
  const res = await axios.get(`${API_URL}/pedidos/${ventaId}/tracking`, {
    headers: buildAuthHeaders(token ?? getClienteToken() ?? getAdminToken())
  });
  return res.data;
};

export const reportRepartidorUbicacion = async (payload: {
  repartidorId: number;
  lat: number;
  lng: number;
  ventaId?: number | null;
}): Promise<{ ok: boolean; ventaId: number | null }> => {
  const res = await axios.post(
    `${API_URL}/repartidores/${payload.repartidorId}/ubicacion`,
    {
      lat: payload.lat,
      lng: payload.lng,
      ventaId: payload.ventaId ?? null
    },
    { headers: buildAuthHeaders(getAdminToken()) }
  );
  return res.data;
};

export const getPedidoActivoRepartidor = async (repartidorId: number): Promise<{ venta: any | null }> => {
  const res = await axios.get(`${API_URL}/repartidores/${repartidorId}/pedido-activo`, {
    headers: buildAuthHeaders(getAdminToken())
  });
  return res.data;
};

export type RepartidorDashboardResponse = {
  repartidor: Repartidor;
  stats: {
    entregados: number;
    rechazados: number;
    activos: number;
    montoEntregado: number;
    montoHoy: number;
    entregadosHoy: number;
  };
  ventaActiva: any | null;
  historial: Array<{
    id: number;
    total: number;
    metodoPago: string | null;
    fecha: string;
    pedidoEstado: string | null;
    pedidoUpdatedAt: string | null;
    direccionEntrega: string | null;
    clienteNombre: string | null;
    clienteTelefono: string | null;
  }>;
};

export const getRepartidorDashboard = async (repartidorId: number): Promise<RepartidorDashboardResponse> => {
  const res = await axios.get(`${API_URL}/repartidores/${repartidorId}/dashboard`, {
    headers: buildAuthHeaders(getAdminToken())
  });
  return res.data;
};

export const updateRepartidorEstado = async (
  repartidorId: number,
  estado: 'libre' | 'ocupado' | 'inactivo'
): Promise<Repartidor> => {
  const res = await axios.put(
    `${API_URL}/repartidores/${repartidorId}/estado`,
    { estado },
    { headers: buildAuthHeaders(getAdminToken()) }
  );
  return res.data;
};

export const updateRepartidorPerfil = async (
  repartidorId: number,
  payload: {
    nombreCompleto: string;
    telefono?: string | null;
    motoMatricula?: string | null;
    password?: string;
  }
): Promise<Repartidor> => {
  const res = await axios.put(`${API_URL}/repartidores/${repartidorId}/perfil`, payload, {
    headers: buildAuthHeaders(getAdminToken())
  });
  return res.data;
};
