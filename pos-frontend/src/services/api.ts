/*
 * MAPA DEL ARCHIVO: SERVICIO FRONTEND
 * UBICACION: pos-frontend/src/services/api.ts
 * QUE HACE: Funciones HTTP que conectan React con el backend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
import { AppConfig } from '../utils/appConfig';
import { BoletaConfig } from '../utils/boletaConfig';
import { VueltoConfig } from '../utils/vueltoConfig';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import {
  Venta,
  VentaCreatePayload,
  DashboardStats,
  LoginData,
  AuthResponse,
  User,
  UsuarioItem,
  UsuarioPayload,
  CajaSesion,
  PedidoOnline,
  PedidoOnlineCreatePayload,
  InventarioMovimiento,
  InventarioLote,
  AuditoriaLog
} from '../types';

// SERVICIO: build Auth Headers comunica este modulo con una API o backend.
const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

// Productos
// SERVICIO FRONTEND: get Productos llama al backend y devuelve la respuesta a React.
export const getProductos = async (token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/productos`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: create Producto llama al backend y devuelve la respuesta a React.
export const createProducto = async (productoData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/productos`, productoData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: update Producto llama al backend y devuelve la respuesta a React.
export const updateProducto = async (id: number, productoData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/productos/${id}`, productoData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: delete Producto llama al backend y devuelve la respuesta a React.
export const deleteProducto = async (id: number, token?: string | null) => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/productos/${id}`, {
    headers: buildAuthHeaders(authToken)
  });
};

// Categorías
// SERVICIO FRONTEND: get Categorias llama al backend y devuelve la respuesta a React.
export const getCategorias = async (token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/categorias`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: create Categoria llama al backend y devuelve la respuesta a React.
export const createCategoria = async (categoriaData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/categorias`, categoriaData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: update Categoria llama al backend y devuelve la respuesta a React.
export const updateCategoria = async (id: number, categoriaData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/categorias/${id}`, categoriaData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: delete Categoria llama al backend y devuelve la respuesta a React.
export const deleteCategoria = async (id: number, token?: string | null) => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/categorias/${id}`, {
    headers: buildAuthHeaders(authToken)
  });
};

// Usuarios
// SERVICIO FRONTEND: get Usuarios llama al backend y devuelve la respuesta a React.
export const getUsuarios = async (token?: string | null): Promise<UsuarioItem[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/usuarios`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: create Usuario llama al backend y devuelve la respuesta a React.
export const createUsuario = async (payload: UsuarioPayload, token?: string | null): Promise<UsuarioItem> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/usuarios`, payload, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: update Usuario llama al backend y devuelve la respuesta a React.
export const updateUsuario = async (id: number, payload: UsuarioPayload, token?: string | null): Promise<UsuarioItem> => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/usuarios/${id}`, payload, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: unlock Usuario llama al backend y devuelve la respuesta a React.
export const unlockUsuario = async (id: number, token?: string | null): Promise<UsuarioItem> => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/usuarios/${id}/unlock`, {}, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: delete Usuario llama al backend y devuelve la respuesta a React.
export const deleteUsuario = async (id: number, token?: string | null): Promise<void> => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/usuarios/${id}`, {
    headers: buildAuthHeaders(authToken)
  });
};

export interface ConfiguracionSistemaPayload {
  personalizacion?: AppConfig;
  boleta?: BoletaConfig;
  vueltos?: VueltoConfig;
}

export interface ConfiguracionSistemaResponse {
  personalizacion: AppConfig | null;
  boleta: BoletaConfig | null;
  vueltos: VueltoConfig | null;
}

export interface ConfiguracionPublicaResponse {
  personalizacion: AppConfig | null;
}

// SERVICIO PUBLICO: obtiene el nombre y apariencia globales para login y pagina inicial.
export const getConfiguracionPublica = async (): Promise<ConfiguracionPublicaResponse> => {
  const res = await axios.get(`${API_URL}/configuracion/public`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  return res.data;
};

// SERVICIO FRONTEND: get Configuracion Sistema lee Personalizacion y Boleta desde la base de datos.
export const getConfiguracionSistema = async (token?: string | null): Promise<ConfiguracionSistemaResponse> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/configuracion`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// SERVICIO FRONTEND: save Configuracion Sistema guarda Personalizacion y Boleta en la base de datos.
export const saveConfiguracionSistema = async (
  payload: ConfiguracionSistemaPayload,
  token?: string | null
): Promise<ConfiguracionSistemaResponse> => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/configuracion`, payload, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// Ventas
// SERVICIO FRONTEND: get Ventas llama al backend y devuelve la respuesta a React.
export const getVentas = async (): Promise<Venta[]> => {
    const token = getToken();
    const res = await axios.get(`${API_URL}/ventas`, {
        headers: buildAuthHeaders(token)
    });
    return res.data;
};

// SERVICIO FRONTEND: create Venta llama al backend y devuelve la respuesta a React.
export const createVenta = async (ventaData: VentaCreatePayload, token?: string | null): Promise<Venta> => {
    const authToken = token ?? getToken();
    const res = await axios.post(`${API_URL}/ventas`, ventaData, {
        headers: buildAuthHeaders(authToken)
    });
    return res.data;
};

export const anularVenta = async (id: number, motivo: string, token?: string | null): Promise<Venta> => {
    const authToken = token ?? getToken();
    const res = await axios.patch(`${API_URL}/ventas/${id}/anular`, { motivo }, {
        headers: buildAuthHeaders(authToken)
    });
    return res.data;
};

export type ClienteCuentaPayload = {
  nombre: string; dni: string; email: string; telefono: string; direccion?: string; password?: string;
};
export type ClienteAuthResponse = {
  token: string;
  cliente: { id: number; nombre: string; dni: string; email: string; telefono: string; direccion: string };
};

export const registerCliente = async (payload: ClienteCuentaPayload): Promise<ClienteAuthResponse> => {
  const res = await axios.post(`${API_URL}/clientes/register`, payload);
  return res.data;
};

export const loginCliente = async (email: string, password: string): Promise<ClienteAuthResponse> => {
  const res = await axios.post(`${API_URL}/clientes/login`, { email, password });
  return res.data;
};

export const loginClienteGoogle = async (credential: string): Promise<ClienteAuthResponse> => {
  const res = await axios.post(`${API_URL}/clientes/google`, { credential });
  return res.data;
};

export const getClienteActual = async (token: string): Promise<ClienteAuthResponse['cliente']> => {
  const res = await axios.get(`${API_URL}/clientes/me`, { headers: buildAuthHeaders(token) });
  return res.data;
};

export const updateClientePerfil = async (payload: ClienteCuentaPayload, token: string) => {
  const res = await axios.put(`${API_URL}/clientes/me`, payload, { headers: buildAuthHeaders(token) });
  return res.data;
};

export const requestPasswordReset = async (email: string, accountType: 'usuario' | 'cliente') => {
  const res = await axios.post(`${API_URL}/auth/password-reset/request`, { email, accountType });
  return res.data as { message: string };
};

export const verifyPasswordResetCode = async (
  email: string,
  accountType: 'usuario' | 'cliente',
  code: string
) => {
  const res = await axios.post(`${API_URL}/auth/password-reset/verify`, { email, accountType, code });
  return res.data as { message: string; resetToken: string };
};

export const completePasswordReset = async (resetToken: string, newPassword: string) => {
  const res = await axios.post(
    `${API_URL}/auth/password-reset/complete`,
    { newPassword },
    { headers: buildAuthHeaders(resetToken) }
  );
  return res.data as { message: string };
};

// Caja por cajero
export const getCajaActual = async (token?: string | null): Promise<CajaSesion | null> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/cajas/actual`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

export const abrirCaja = async (montoInicial: number, token?: string | null): Promise<CajaSesion> => {
  const authToken = token ?? getToken();
  const res = await axios.post(
    `${API_URL}/cajas/abrir`,
    { montoInicial },
    { headers: buildAuthHeaders(authToken) }
  );
  return res.data;
};

export const cerrarCaja = async (montoFinalDeclarado: number, token?: string | null): Promise<CajaSesion> => {
  const authToken = token ?? getToken();
  const res = await axios.post(
    `${API_URL}/cajas/cerrar`,
    { montoFinalDeclarado },
    { headers: buildAuthHeaders(authToken) }
  );
  return res.data;
};

export const getCajas = async (token?: string | null): Promise<CajaSesion[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/cajas`, { headers: buildAuthHeaders(authToken) });
  return res.data;
};

// Pedidos online
// SERVICIO FRONTEND PUBLICO: registra en MySQL una compra hecha desde la tienda de clientes.
export const createPedidoOnlineCliente = async (payload: PedidoOnlineCreatePayload, token: string): Promise<PedidoOnline> => {
  const res = await axios.post(`${API_URL}/pedidos-online/cliente`, payload, { headers: buildAuthHeaders(token) });
  return res.data;
};

export const getMisPedidosCliente = async (token: string): Promise<PedidoOnline[]> => {
  const res = await axios.get(`${API_URL}/pedidos-online/mine`, { headers: buildAuthHeaders(token) });
  return res.data;
};

export const cancelarPedidoOnlineCliente = async (
  id: number,
  motivo: string,
  token: string
): Promise<PedidoOnline> => {
  const res = await axios.patch(`${API_URL}/pedidos-online/mine/${id}/cancelar`, { motivo }, {
    headers: buildAuthHeaders(token)
  });
  return res.data;
};

// SERVICIO FRONTEND ADMIN: lista pedidos web para que admin/cajero los atienda desde el POS.
export const getPedidosOnline = async (estado?: PedidoOnline['estado'], token?: string | null): Promise<PedidoOnline[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/pedidos-online`, {
    headers: buildAuthHeaders(authToken),
    params: estado ? { estado } : undefined
  });
  return res.data;
};

// SERVICIO FRONTEND PUBLICO: consulta pedidos del cliente por correo para ver su estado actualizado.
// SERVICIO FRONTEND ADMIN: cambia el estado de un pedido web cuando se atiende o se recoge.
export const updatePedidoOnlineEstado = async (
  id: number,
  estado: PedidoOnline['estado'],
  motivo?: string,
  token?: string | null
): Promise<PedidoOnline> => {
  const authToken = token ?? getToken();
  const res = await axios.patch(`${API_URL}/pedidos-online/${id}/estado`, { estado, motivo }, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const getInventarioMovimientos = async (productoId?: number, token?: string | null): Promise<InventarioMovimiento[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/inventario/movimientos`, {
    headers: buildAuthHeaders(authToken),
    params: productoId ? { productoId } : undefined
  });
  return res.data;
};

export const getInventarioLotes = async (token?: string | null): Promise<InventarioLote[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/inventario/lotes`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const registrarPerdidaInventario = async (
  payload: { productoId: number; cantidad: number; tipo: string; motivo: string },
  token?: string | null
): Promise<{ productoId: number; stockAnterior: number; stockNuevo: number }> => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/inventario/perdidas`, payload, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const getAuditoriaLogs = async (token?: string | null): Promise<AuditoriaLog[]> => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/inventario/auditoria`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

// Pagos - Mercado Pago
// SERVICIO FRONTEND: create Mercado Pago Preference llama al backend y devuelve la respuesta a React.
export const createMercadoPagoPreference = async (payload: {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  backUrls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  notificationUrl?: string;
  externalReference?: string;
  metadata?: Record<string, any>;
}, token?: string | null): Promise<{ id: string; init_point: string; sandbox_init_point?: string }> => {
  const res = await axios.post(`${API_URL}/pagos/mercadopago/preference`, payload, {
    headers: buildAuthHeaders(token ?? getToken())
  });
  return res.data;
};

// SERVICIO FRONTEND PUBLICO: crea preferencia Mercado Pago para compras de clientes.
export const createPublicMercadoPagoPreference = async (payload: {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  backUrls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  notificationUrl?: string;
  externalReference?: string;
  metadata?: Record<string, any>;
}): Promise<{ id: string; init_point: string; sandbox_init_point?: string }> => {
  const res = await axios.post(`${API_URL}/pagos/public/mercadopago/preference`, payload);
  return res.data;
};

// SERVICIO FRONTEND: get Mercado Pago Payment llama al backend y devuelve la respuesta a React.
export const getMercadoPagoPayment = async (paymentId: string, token?: string | null): Promise<{
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
}> => {
  const res = await axios.get(`${API_URL}/pagos/mercadopago/payments/${paymentId}`, {
    headers: buildAuthHeaders(token ?? getToken())
  });
  return res.data;
};

// Estadísticas
// SERVICIO FRONTEND: get Dashboard Stats llama al backend y devuelve la respuesta a React.
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const res = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: buildAuthHeaders(getToken())
    });
    return res.data;
};

// DNI (autocompletar datos)
// SERVICIO FRONTEND: get Persona Por Dni llama al backend y devuelve la respuesta a React.
export const getPersonaPorDni = async (dni: string): Promise<{
  dni: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
}> => {
  const cleaned = String(dni || '').trim();
  const res = await axios.get(`${API_URL}/dni/${encodeURIComponent(cleaned)}`, {
    headers: buildAuthHeaders(getToken())
  });
  return res.data;
};

// Autenticación
// SERVICIO: save Auth Token comunica este modulo con una API o backend.
const saveAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

// SERVICIO: get Auth Error Message comunica este modulo con una API o backend.
const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return `No se pudo conectar con el backend (${API_URL}). Inicia el backend y, si usas ngrok, reinicia el frontend para activar el proxy.`;
    }
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

// SERVICIO FRONTEND: login llama al backend y devuelve la respuesta a React.
export const login = async (credentials: LoginData): Promise<AuthResponse> => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, credentials);
        const { token, user } = res.data;
        saveAuthToken(token);
        return { token, user };
    } catch (error) {
        throw new Error(getAuthErrorMessage(error, 'Error de autenticación'));
    }
};

export const loginWithGoogle = async (credential: string): Promise<AuthResponse> => {
  try {
    const res = await axios.post(`${API_URL}/auth/google`, { credential });
    const { token, user } = res.data;
    saveAuthToken(token);
    return { token, user };
  } catch (error) {
    throw new Error(getAuthErrorMessage(error, 'Error al iniciar sesión con Google'));
  }
};

// SERVICIO FRONTEND: get Current User refresca permisos vigentes del usuario logueado.
export const getCurrentUser = async (token?: string | null): Promise<User> => {
    const authToken = token ?? getToken();
    const res = await axios.get(`${API_URL}/auth/me`, {
        headers: buildAuthHeaders(authToken)
    });
    return res.data.user;
};
