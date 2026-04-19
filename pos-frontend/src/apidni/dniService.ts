import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';

export interface ClienteDniData {
  dni: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
}

export const buscarClientePorDni = async (dni: string): Promise<ClienteDniData> => {
  const cleanedDni = dni.trim();
  if (!/^\d{8}$/.test(cleanedDni)) {
    throw new Error('El DNI debe tener 8 dígitos');
  }

  const token = getToken();
  const response = await axios.get(`${API_URL}/dni/${cleanedDni}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 10000
  });

  return response.data as ClienteDniData;
};
