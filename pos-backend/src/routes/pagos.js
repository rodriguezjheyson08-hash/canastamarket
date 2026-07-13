/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/pagos.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// RUTA BACKEND - PAGOS:
// Expone endpoints de Mercado Pago y los conecta con su controller.
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  mercadoPagoWebhook
} = require('../pagos/mercadopagoController');

const router = express.Router();

// RUTA BACKEND: endpoint POST '/mercadopago/preference'; conecta la URL con el controlador correspondiente.
router.post('/mercadopago/preference', requireAuth({ type: 'admin' }), asyncHandler(createMercadoPagoPreference));
// RUTA BACKEND PUBLICA CLIENTE:
// Permite que la tienda publica cree una preferencia de Mercado Pago sin sesion admin/cajero.
router.post('/public/mercadopago/preference', asyncHandler(createMercadoPagoPreference));
router.get('/mercadopago/payments/:id', requireAuth({ type: 'admin' }), asyncHandler(getMercadoPagoPayment));
router.get('/public/mercadopago/payments/:id', asyncHandler(getMercadoPagoPayment));
router.post('/mercadopago/webhook', asyncHandler(mercadoPagoWebhook));

module.exports = router;
