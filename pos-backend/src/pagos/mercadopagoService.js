/*
 * MAPA DEL ARCHIVO: PAGOS BACKEND
 * UBICACION: pos-backend/src/pagos/mercadopagoService.js
 * QUE HACE: Logica de pagos e integracion con Mercado Pago.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const axios = require('axios');
const env = require('../config/env');

const MP_BASE_URL = 'https://api.mercadopago.com';

// LOGICA: get Access Token concentra una operacion de este archivo.
const getAccessToken = () => {
  const token = env.mercadoPago?.accessToken || process.env.MP_ACCESS_TOKEN;
  if (!token) {
    const error = new Error('MP_ACCESS_TOKEN no está configurado.');
    error.status = 500;
    throw error;
  }
  return token;
};

const mpClient = axios.create({
  baseURL: MP_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

// LOGICA: create Preference concentra una operacion de este archivo.
const createPreference = async (payload) => {
  const token = getAccessToken();
  const res = await mpClient.post('/checkout/preferences', payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// LOGICA: get Payment concentra una operacion de este archivo.
const getPayment = async (paymentId) => {
  const token = getAccessToken();
  const res = await mpClient.get(`/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

module.exports = {
  createPreference,
  getPayment
};
