const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listVentas,
  listVentasByCliente,
  listPedidos,
  updatePedidoEstado,
  createVenta,
  deleteVentas,
  deleteVentasBatch
} = require('../controllers/ventasController');

const router = express.Router();

router.get('/', requireAuth({ type: 'admin' }), asyncHandler(listVentas));
router.get('/cliente/:clienteId', requireAuth({ types: ['cliente', 'admin'] }), asyncHandler(listVentasByCliente));
// Alias para pedidos (compatibilidad)
router.get('/pedidos', requireAuth({ type: 'admin' }), asyncHandler(listPedidos));
router.put('/pedidos/:ventaId/estado', requireAuth({ types: ['cliente', 'admin', 'repartidor'] }), asyncHandler(updatePedidoEstado));
router.post('/', requireAuth({ types: ['cliente', 'admin'] }), asyncHandler(createVenta));
router.post('/delete-batch', requireAuth({ type: 'admin' }), asyncHandler(deleteVentasBatch));
router.delete('/', requireAuth({ type: 'admin' }), asyncHandler(deleteVentas));

module.exports = router;
