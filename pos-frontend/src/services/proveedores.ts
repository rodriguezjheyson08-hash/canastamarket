import axios from 'axios';
import { getToken } from '../utils/auth';
import { PedidoCompra, Proveedor } from '../types';
import { API_URL } from '../utils/apiBase';

const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const getProveedores = async (token?: string | null): Promise<Proveedor[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const createProveedor = async (payload: Partial<Proveedor>, token?: string | null): Promise<Proveedor> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/proveedores`, payload, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const updateProveedor = async (id: number, payload: Partial<Proveedor>, token?: string | null): Promise<Proveedor> => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/proveedores/${id}`, payload, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const deleteProveedor = async (id: number, token?: string | null): Promise<void> => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/proveedores/${id}`, { headers: buildAuthHeaders(authToken) });
};

export const getProveedorPorRuc = async (ruc: string, token?: string | null): Promise<Proveedor> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/ruc/${encodeURIComponent(ruc)}`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const consultarRuc = async (ruc: string, token?: string | null): Promise<{
  numero_documento: string;
  razon_social: string;
  estado?: string | null;
  condicion?: string | null;
  direccion?: string | null;
  ubigeo?: string | null;
  via_tipo?: string | null;
  via_nombre?: string | null;
  zona_codigo?: string | null;
  zona_tipo?: string | null;
  numero?: string | null;
  interior?: string | null;
  lote?: string | null;
  dpto?: string | null;
  manzana?: string | null;
  kilometro?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  tipo?: string | null;
  actividad_economica?: string | null;
  numero_trabajadores?: number | string | null;
  tipo_facturacion?: string | null;
  tipo_contabilidad?: string | null;
  comercio_exterior?: string | null;
  es_agente_retencion?: boolean | null;
  es_buen_contribuyente?: boolean | null;
  locales_anexos?: any;
}> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/consulta-ruc/${encodeURIComponent(ruc)}`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const createPedidoCompra = async (payload: {
  proveedorId: number;
  items: Array<{ productoId: number; cantidad: number }>;
  notas?: string;
}, token?: string | null): Promise<PedidoCompra> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/proveedores/pedidos`, payload, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const listPedidosCompra = async (token?: string | null): Promise<PedidoCompra[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const getPedidoCompra = async (pedidoId: number, token?: string | null): Promise<PedidoCompra> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos/${pedidoId}`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const deletePedidoCompra = async (pedidoId: number, token?: string | null): Promise<void> => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/proveedores/pedidos/${pedidoId}`, { headers: buildAuthHeaders(authToken) });
};

export const deletePedidosCompraByIds = async (
  ids: number[],
  token?: string | null
): Promise<{ deleted: number; ids: number[] }> => {
  const authToken = token ?? getToken();
  const res = await axios.post(
    `${API_URL}/proveedores/pedidos/delete-batch`,
    { ids },
    { headers: buildAuthHeaders(authToken) }
  );
  return res.data;
};

export const downloadPedidoCompraCsv = async (pedidoId: number, token?: string | null): Promise<Blob> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos/${pedidoId}/csv`, {
    headers: buildAuthHeaders(authToken),
    responseType: 'blob'
  });
  return res.data as Blob;
};
