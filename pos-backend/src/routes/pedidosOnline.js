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
  updatePedidoOnlineEstado
} = require('../controllers/pedidosOnlineController');

const router = express.Router();

// RUTAS DE CLIENTE AUTENTICADO:
router.post('/cliente', requireAuth({ type: 'cliente' }), asyncHandler(createPedidoOnlineCliente));
router.get('/mine', requireAuth({ type: 'cliente' }), asyncHandler(listPedidosOnlineMine));

// RUTAS INTERNAS - ADMIN/CAJERO:
// Permiten ver pedidos recibidos y actualizar su estado desde el sistema POS.
router.get('/', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(listPedidosOnline));
router.patch('/:id/estado', requireAuth({ type: 'admin' }), requirePermission('pedidosOnline'), asyncHandler(updatePedidoOnlineEstado));

module.exports = router;
