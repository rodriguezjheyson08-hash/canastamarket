const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { listPedidos, updatePedidoEstado } = require('../controllers/ventasController');
const { assignPedidoToRepartidor, getPedidoTracking } = require('../controllers/repartosController');

const router = express.Router();

router.get('/', requireAuth({ type: 'admin' }), asyncHandler(listPedidos));
router.put('/:ventaId/asignar', requireAuth({ type: 'admin' }), asyncHandler(assignPedidoToRepartidor));
router.get('/:ventaId/tracking', requireAuth({ types: ['cliente', 'admin', 'repartidor'] }), asyncHandler(getPedidoTracking));
router.put('/:ventaId/estado', requireAuth({ types: ['cliente', 'admin', 'repartidor'] }), asyncHandler(updatePedidoEstado));

module.exports = router;
