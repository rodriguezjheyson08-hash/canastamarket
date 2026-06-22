/*
 * MAPA DEL ARCHIVO: SERVICIO FRONTEND
 * UBICACION: pos-frontend/src/apidni/dniService.ts
 * QUE HACE: Pide al backend los datos de un cliente por DNI.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_URL } from '../utils/apiBase';

// TIPOS FRONTEND: estructura de datos ClienteDniData usada para tipar objetos del modulo.
export interface ClienteDniData {
  dni: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
}

// SERVICIO FRONTEND - BUSCAR CLIENTE POR DNI:
// Valida que el DNI tenga 8 digitos y llama al endpoint /dni del backend.
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
