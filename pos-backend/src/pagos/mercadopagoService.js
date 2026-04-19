const axios = require('axios');
const env = require('../config/env');

const MP_BASE_URL = 'https://api.mercadopago.com';

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

const createPreference = async (payload) => {
  const token = getAccessToken();
  const res = await mpClient.post('/checkout/preferences', payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

const getPayment = async (paymentId) => {
  const token = getAccessToken();
  const res = await mpClient.get(`/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

const searchPaymentsByExternalReference = async (externalReference, limit = 10) => {
  const token = getAccessToken();
  const res = await mpClient.get('/v1/payments/search', {
    params: {
      external_reference: externalReference,
      sort: 'date_created',
      criteria: 'desc',
      limit
    },
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

module.exports = {
  createPreference,
  getPayment,
  searchPaymentsByExternalReference
};
