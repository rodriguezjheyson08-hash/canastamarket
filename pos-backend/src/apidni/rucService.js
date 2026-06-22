/*
 * MAPA DEL ARCHIVO: SERVICIO BACKEND
 * UBICACION: pos-backend/src/apidni/rucService.js
 * QUE HACE: Consulta RUC en un servicio externo desde el backend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const axios = require('axios');
const env = require('../config/env');

const rucClient = axios.create({
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' }
});

// SERVICIO BACKEND - URL RUC:
// Construye la URL final. Acepta plantillas con {ruc} o agrega parametro numero=<ruc>.
const buildRucUrl = (baseUrl, ruc) => {
  const raw = String(baseUrl || '').trim();
  if (!raw) {
    const error = new Error('RUC_BASE_URL no está configurado.');
    error.status = 500;
    throw error;
  }

  if (raw.includes('{ruc}')) {
    return raw.replaceAll('{ruc}', encodeURIComponent(ruc));
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const error = new Error('RUC_BASE_URL no es una URL válida.');
    error.status = 500;
    throw error;
  }

  parsed.searchParams.delete('numero');
  parsed.searchParams.set('numero', ruc);
  return parsed.toString();
};

// SERVICIO BACKEND - CONSULTA RUC:
// Valida que el RUC tenga 11 digitos, llama la API configurada y devuelve sus datos.
const consultarRuc = async (ruc) => {
  const cleanedRuc = String(ruc || '').trim();
  if (!/^\d{11}$/.test(cleanedRuc)) {
    const error = new Error('El RUC debe tener 11 dígitos.');
    error.status = 400;
    throw error;
  }

  const baseUrl = env.ruc?.baseUrl || process.env.RUC_BASE_URL;
  const token = env.ruc?.token || process.env.RUC_TOKEN;
  const requestUrl = buildRucUrl(baseUrl, cleanedRuc);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await rucClient.get(requestUrl, { headers });
  return response.data;
};

module.exports = {
  consultarRuc
};
