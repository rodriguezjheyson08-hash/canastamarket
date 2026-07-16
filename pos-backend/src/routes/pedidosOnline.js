/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/pedidosOnline.js
 * QUE HACE: Expone endpoints de pedidos web para cliente y panel interno.
 * GUIA: /cliente y /mine requieren sesión de cliente; / requiere personal autenticado.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { requirePermission } = require('../utils/requirePermission');
const {
  createPedidoOnlineCliente,
  listPedidosOnlineMine,
  listPedidosOnline,
  getPedidoOnlinePushPublicKey,
  subscribePedidoOnlinePush,
  enviarPedidoOnlineBoletaEmail,
  updatePedidoOnlineEstado,
  cancelarPedidoOnlineCliente
} = require('../controllers/pedidosOnlineController');

const router = express.Router();

// RUTAS DE CLIENTE AUTENTICADO:
router.post('/cliente', requireAuth({ type: 'cliente' }), asyncHandler(createPedidoOnlineCliente));
router.get('/mine', requireAuth({ type: 'cliente' }), asyncHandler(listPedidosOnlineMine));
router.patch('/mine/:id/cancelar', requireAuth({ type: 'cliente' }), asyncHandler(cancelarPedidoOnlineCliente));

// RUTAS INTERNAS - ADMIN/CAJERO:
// Permiten ver pedidos recibidos y actualizar su estado desde el sistema POS.
router.get('/push/public-key', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(getPedidoOnlinePushPublicKey));
router.post('/push/subscribe', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(subscribePedidoOnlinePush));
router.get('/', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(listPedidosOnline));
router.post('/:id/boleta/email', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(enviarPedidoOnlineBoletaEmail));
router.patch('/:id/estado', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(updatePedidoOnlineEstado));

module.exports = router;
