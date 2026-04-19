import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';
const buildAuthHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export type TiendaConfig = {
  appName: string | null;
  logo: string | null;
  tiendaDireccion: string | null;
  tiendaLat: number | null;
  tiendaLng: number | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  deliveryEnabled: boolean;
  deliveryBase: number;
  deliveryPerKm: number;
  deliveryIncludedKm: number;
  deliveryMinFee: number;
  deliverySmallOrderThreshold: number;
  deliverySmallOrderFee: number;
  deliveryMaxKm: number;
  updatedAt?: string | null;
};

export const getTiendaConfig = async (): Promise<TiendaConfig> => {
  const res = await axios.get(`${API_URL}/tienda/config`);
  return res.data;
};

export const updateTiendaConfig = async (payload: Partial<TiendaConfig>): Promise<TiendaConfig> => {
  const res = await axios.put(`${API_URL}/tienda/config`, payload, {
    headers: buildAuthHeaders(getToken())
  });
  return res.data;
};
