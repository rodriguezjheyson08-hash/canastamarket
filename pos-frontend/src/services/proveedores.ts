/*
 * MAPA DEL ARCHIVO: SERVICIO FRONTEND
 * UBICACION: pos-frontend/src/services/proveedores.ts
 * QUE HACE: Funciones HTTP que conectan React con el backend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { PedidoCompra, Proveedor } from '../types';

// SERVICIO: build Auth Headers comunica este modulo con una API o backend.
const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const getProveedores = async (token?: string | null): Promise<Proveedor[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: create Proveedor llama al backend y devuelve la respuesta a React.
export const createProveedor = async (payload: Partial<Proveedor>, token?: string | null): Promise<Proveedor> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/proveedores`, payload, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: update Proveedor llama al backend y devuelve la respuesta a React.
export const updateProveedor = async (id: number, payload: Partial<Proveedor>, token?: string | null): Promise<Proveedor> => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/proveedores/${id}`, payload, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: delete Proveedor llama al backend y devuelve la respuesta a React.
export const deleteProveedor = async (id: number, token?: string | null): Promise<void> => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/proveedores/${id}`, { headers: buildAuthHeaders(authToken) });
};

// SERVICIO FRONTEND: consultar Ruc llama al backend y devuelve la respuesta a React.
export const consultarRuc = async (ruc: string, token?: string | null): Promise<any> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/consulta-ruc/${encodeURIComponent(ruc)}`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: list Pedidos Compra llama al backend y devuelve la respuesta a React.
export const listPedidosCompra = async (token?: string | null): Promise<PedidoCompra[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: get Pedido Compra llama al backend y devuelve la respuesta a React.
export const getPedidoCompra = async (pedidoId: number, token?: string | null): Promise<PedidoCompra> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos/${pedidoId}`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: create Pedido Compra llama al backend y devuelve la respuesta a React.
export const createPedidoCompra = async (
  payload: {
    proveedorId: number;
    items: Array<{ productoId: number; cantidad: number }>;
    notas?: string;
    solicitanteDni?: string;
    solicitanteNombre?: string;
    comprador?: {
      nombre?: string;
      ruc?: string;
      direccion?: string;
      telefono?: string;
    };
  },
  token?: string | null
): Promise<PedidoCompra> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/proveedores/pedidos`, payload, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: delete Pedido Compra llama al backend y devuelve la respuesta a React.
export const deletePedidoCompra = async (pedidoId: number, token?: string | null): Promise<void> => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/proveedores/pedidos/${pedidoId}`, { headers: buildAuthHeaders(authToken) });
};

// SERVICIO FRONTEND: delete Pedidos Compra By Ids llama al backend y devuelve la respuesta a React.
export const deletePedidosCompraByIds = async (
  ids: number[],
  token?: string | null
): Promise<{ deleted: number; ids: number[] }> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/proveedores/pedidos/delete-batch`, { ids }, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// SERVICIO FRONTEND: download Pedido Compra Csv llama al backend y devuelve la respuesta a React.
export const downloadPedidoCompraCsv = async (pedidoId: number, token?: string | null): Promise<Blob> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos/${pedidoId}/csv`, {
    headers: buildAuthHeaders(authToken),
    responseType: 'blob'
  });
  return res.data as Blob;
};

// SERVICIO FRONTEND: download Pedido Compra Pdf llama al backend y devuelve la respuesta a React.
export const downloadPedidoCompraPdf = async (pedidoId: number, token?: string | null): Promise<Blob> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/proveedores/pedidos/${pedidoId}/pdf`, {
    headers: buildAuthHeaders(authToken),
    responseType: 'blob'
  });
  return res.data as Blob;
};
