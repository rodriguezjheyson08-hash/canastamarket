const axios = require('axios');
const env = require('../config/env');

const rucClient = axios.create({
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' }
});

const getRucConfig = () => {
  const baseUrl = env.ruc?.baseUrl || process.env.RUC_BASE_URL;
  const token = env.ruc?.token || process.env.RUC_TOKEN;

  if (!baseUrl) {
    const error = new Error('RUC_BASE_URL no está configurado.');
    error.status = 500;
    throw error;
  }

  return { baseUrl, token };
};

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

const consultarRuc = async (ruc) => {
  const cleanedRuc = String(ruc || '').trim();
  if (!/^\d{11}$/.test(cleanedRuc)) {
    const error = new Error('El RUC debe tener 11 dígitos.');
    error.status = 400;
    throw error;
  }

  const { baseUrl, token } = getRucConfig();
  const requestUrl = buildRucUrl(baseUrl, cleanedRuc);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await rucClient.get(requestUrl, { headers });
  return response.data;
};

module.exports = {
  consultarRuc
};

