/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/pedidosOnline.js
 * QUE HACE: Expone endpoints de pedidos web para cliente y panel interno.
 * GUIA: /public lo usa la tienda; / lo usa admin/cajero autenticado.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  createPedidoOnlinePublic,
  getPedidoOnlineByCodigo,
  listPedidosOnlinePublic,
  listPedidosOnline,
  updatePedidoOnlineEstado
} = require('../controllers/pedidosOnlineController');

const router = express.Router();

// RUTA PUBLICA - CLIENTE:
// Registra una compra hecha desde /cliente sin usar token de admin/cajero.
router.post('/public', asyncHandler(createPedidoOnlinePublic));
router.get('/public', asyncHandler(listPedidosOnlinePublic));
router.get('/public/:codigo', asyncHandler(getPedidoOnlineByCodigo));

// RUTAS INTERNAS - ADMIN/CAJERO:
// Permiten ver pedidos recibidos y actualizar su estado desde el sistema POS.
router.get('/', requireAuth({ type: 'admin' }), asyncHandler(listPedidosOnline));
router.patch('/:id/estado', requireAuth({ type: 'admin' }), asyncHandler(updatePedidoOnlineEstado));

module.exports = router;
