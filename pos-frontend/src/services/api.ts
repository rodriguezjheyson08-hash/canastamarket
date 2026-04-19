import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
import { Venta, VentaCreatePayload, DashboardStats, LoginData, User, RegisterData, UserPermissions } from '../types';

const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

// Productos
export const getProductos = async (token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/productos`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const createProducto = async (productoData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/productos`, productoData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const updateProducto = async (id: number, productoData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/productos/${id}`, productoData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const deleteProducto = async (id: number, token?: string | null) => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/productos/${id}`, {
    headers: buildAuthHeaders(authToken)
  });
};

// Categorías
export const getCategorias = async (token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.get(`${API_URL}/categorias`, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const createCategoria = async (categoriaData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.post(`${API_URL}/categorias`, categoriaData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const updateCategoria = async (id: number, categoriaData: any, token?: string | null) => {
  const authToken = token ?? getToken();
  const res = await axios.put(`${API_URL}/categorias/${id}`, categoriaData, {
    headers: buildAuthHeaders(authToken)
  });
  return res.data;
};

export const deleteCategoria = async (id: number, token?: string | null) => {
  const authToken = token ?? getToken();
  await axios.delete(`${API_URL}/categorias/${id}`, {
    headers: buildAuthHeaders(authToken)
  });
};

// Ventas
export const getVentas = async (): Promise<Venta[]> => {
    const token = getToken();
    const res = await axios.get(`${API_URL}/ventas`, {
        headers: buildAuthHeaders(token)
    });
    return res.data;
};

export const createVenta = async (ventaData: VentaCreatePayload, token?: string | null): Promise<Venta> => {
    const authToken = token ?? getToken();
    const res = await axios.post(`${API_URL}/ventas`, ventaData, {
        headers: buildAuthHeaders(authToken)
    });
    return res.data;
};

export const deleteVentas = async (token?: string | null): Promise<void> => {
    const authToken = token ?? getToken();
    await axios.delete(`${API_URL}/ventas`, {
        headers: buildAuthHeaders(authToken)
    });
};

export const deleteVentasByIds = async (ids: number[], token?: string | null): Promise<{ deleted: number; ids: number[] }> => {
    const authToken = token ?? getToken();
    const res = await axios.post(
      `${API_URL}/ventas/delete-batch`,
      { ids },
      {
        headers: buildAuthHeaders(authToken)
      }
    );
    return res.data;
};

// Pagos - Mercado Pago
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

export const searchMercadoPagoPayment = async (externalReference: string, token?: string | null): Promise<{
  payment: null | {
    id: number;
    status: string;
    status_detail?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
}> => {
  const res = await axios.get(`${API_URL}/pagos/mercadopago/payments/search`, {
    params: { external_reference: externalReference },
    headers: buildAuthHeaders(token ?? getToken())
  });
  return res.data;
};

// Estadísticas y reportes
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const res = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: buildAuthHeaders(getToken())
    });
    return res.data;
};

export const getVentasDeHoy = async (): Promise<Venta[]> => {
    const token = getToken();
    const res = await axios.get(`${API_URL}/ventas`, {
        headers: buildAuthHeaders(token)
    });
    const hoy = new Date().toISOString().slice(0, 10);
    return res.data.filter((v: Venta) => v.fecha && v.fecha.startsWith(hoy));
};

// DNI (autocompletar datos)
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
export const login = async (credentials: LoginData): Promise<{ token: string, user: User }> => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, credentials);
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        return { token, user };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || 'Error de autenticación';
            throw new Error(message);
        }
        throw error;
    }
};

export const register = async (userData: RegisterData): Promise<User> => {
    // Simulación de registro
    if (userData.password !== userData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
    }

    return {
        nombreUsuario: userData.nombreUsuario,
        nombreCompleto: userData.nombreCompleto,
        rol: userData.rol
    };
};

// Usuarios (gestión)
export interface UsuarioItem {
  id: number;
  nombre_usuario: string;
  nombre_completo: string;
  rol: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR';
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  foto_url?: string | null;
  permisos?: Partial<UserPermissions> | null;
  moto_matricula?: string | null;
  repartidor_estado?: string | null;
  last_lat?: number | null;
  last_lng?: number | null;
  last_seen_at?: string | null;
  failed_attempts?: number | null;
  lockouts?: number | null;
  lock_until?: string | null;
  is_blocked?: number | null;
  is_active?: number | null;
}

const parsePermisos = (value: unknown): Partial<UserPermissions> | null => {
  if (!value) return null;
  if (typeof value === 'object') return value as Partial<UserPermissions>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed as Partial<UserPermissions>;
      return null;
    } catch {
      return null;
    }
  }
  return null;
};

const normalizeUsuarioItem = (item: any): UsuarioItem => ({
  ...item,
  permisos: parsePermisos(item?.permisos)
});

export const getUsuarios = async (): Promise<UsuarioItem[]> => {
  const token = getToken();
  const res = await axios.get(`${API_URL}/usuarios`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return (res.data || []).map(normalizeUsuarioItem);
};

export const createUsuario = async (payload: {
  nombreUsuario: string;
  nombreCompleto: string;
  rol: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR';
  password: string;
  telefono?: string;
  email?: string;
  fotoUrl?: string;
  permisos?: Partial<UserPermissions> | null;
  motoMatricula?: string;
  repartidorEstado?: 'libre' | 'ocupado' | 'inactivo' | string;
}): Promise<UsuarioItem> => {
  const token = getToken();
  const res = await axios.post(`${API_URL}/usuarios`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeUsuarioItem(res.data);
};

export const updateUsuario = async (
  id: number,
  payload: {
    nombreUsuario?: string;
    nombreCompleto?: string;
    rol?: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR';
    password?: string;
    telefono?: string;
    email?: string;
    fotoUrl?: string;
    isActive?: boolean;
    permisos?: Partial<UserPermissions> | null;
    motoMatricula?: string;
    repartidorEstado?: 'libre' | 'ocupado' | 'inactivo' | string;
  }
): Promise<UsuarioItem> => {
  const token = getToken();
  const res = await axios.put(`${API_URL}/usuarios/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeUsuarioItem(res.data);
};

export const unlockUsuario = async (id: number): Promise<UsuarioItem> => {
  const token = getToken();
  const res = await axios.put(`${API_URL}/usuarios/${id}/unlock`, null, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return normalizeUsuarioItem(res.data);
};

export const deleteUsuario = async (id: number): Promise<void> => {
  const token = getToken();
  await axios.delete(`${API_URL}/usuarios/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
