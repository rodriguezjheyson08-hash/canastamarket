const axios = require('axios');
const env = require('../config/env');

const dniClient = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

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

const consultarDni = async (dni) => {
  const cleanedDni = String(dni || '').trim();
  if (!/^\d{8}$/.test(cleanedDni)) {
    const error = new Error('El DNI debe tener 8 dígitos.');
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
