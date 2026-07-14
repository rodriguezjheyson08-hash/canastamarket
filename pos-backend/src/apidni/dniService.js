/*
 * MAPA DEL ARCHIVO: SERVICIO BACKEND
 * UBICACION: pos-backend/src/apidni/dniService.js
 * QUE HACE: Consulta DNI en un servicio externo desde el backend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const axios = require('axios');
const env = require('../config/env');

const dniClient = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// SERVICIO BACKEND - CONFIGURACION RENIEC:
// Lee URL y token de RENIEC desde env; si faltan, corta la consulta con error controlado.
const getReniecConfig = () => {
  const baseUrl = env.reniec?.baseUrl || process.env.RENIEC_BASE_URL;
  const token = env.reniec?.token || process.env.RENIEC_TOKEN;

  if (!baseUrl) {
    const error = new Error('RENIEC_BASE_URL no está configurado.');
    error.status = 500;
    throw error;
  }

  if (!token) {
    const error = new Error('RENIEC_TOKEN no está configurado.');
    error.status = 500;
    throw error;
  }

  return { baseUrl, token };
};

// SERVICIO BACKEND - URL RENIEC:
// Construye la URL final agregando el parametro numero=<dni> sin duplicarlo.
const buildReniecUrl = (baseUrl, dni) => {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    const error = new Error('RENIEC_BASE_URL no es una URL válida.');
    error.status = 500;
    throw error;
  }

  // Si el usuario configuró ".../dni?numero=", removemos ese valor vacío
  // y dejamos solo el número final correcto.
  parsed.searchParams.delete('numero');
  parsed.searchParams.set('numero', dni);
  return parsed.toString();
};

// SERVICIO BACKEND - CONSULTA DNI:
// Valida que el DNI tenga 8 digitos, llama RENIEC y devuelve la respuesta cruda al controller.
const consultarDni = async (dni) => {
  const cleanedDni = String(dni || '').trim();
  if (!/^\d{8}$/.test(cleanedDni) || /^(\d)\1{7}$/.test(cleanedDni)) {
    const error = new Error('Ingresa un DNI valido de 8 digitos.');
    error.status = 400;
    throw error;
  }

  const { baseUrl, token } = getReniecConfig();
  const requestUrl = buildReniecUrl(baseUrl, cleanedDni);

  const response = await dniClient.get(requestUrl, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
};

module.exports = {
  consultarDni
};
