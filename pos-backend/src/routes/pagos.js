const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  searchMercadoPagoPayment,
  mercadoPagoWebhook
} = require('../pagos/mercadopagoController');

const router = express.Router();

router.post('/mercadopago/preference', requireAuth({ types: ['admin', 'cliente'] }), asyncHandler(createMercadoPagoPreference));
router.get('/mercadopago/payments/:id', requireAuth({ types: ['admin', 'cliente'] }), asyncHandler(getMercadoPagoPayment));
router.get('/mercadopago/payments/search', requireAuth({ types: ['admin', 'cliente'] }), asyncHandler(searchMercadoPagoPayment));
router.post('/mercadopago/webhook', asyncHandler(mercadoPagoWebhook));

module.exports = router;
