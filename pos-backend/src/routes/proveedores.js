const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listProveedores,
  getProveedorByRuc,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  consultarRucApi,
  listPedidosCompra,
  getPedidoCompra,
  createPedidoCompra,
  deletePedidoCompra,
  deletePedidosCompraBatch,
  downloadPedidoCsv
} = require('../controllers/proveedoresController');

const router = express.Router();

router.use(requireAuth({ type: 'admin' }));

// Pedidos de compra
router.get('/pedidos', asyncHandler(listPedidosCompra));
router.post('/pedidos', asyncHandler(createPedidoCompra));
router.post('/pedidos/delete-batch', asyncHandler(deletePedidosCompraBatch));
router.get('/pedidos/:id', asyncHandler(getPedidoCompra));
router.delete('/pedidos/:id', asyncHandler(deletePedidoCompra));
router.get('/pedidos/:id/csv', asyncHandler(downloadPedidoCsv));

// Proveedores
router.get('/', asyncHandler(listProveedores));
router.post('/', asyncHandler(createProveedor));
router.get('/ruc/:ruc', asyncHandler(getProveedorByRuc));
router.get('/consulta-ruc/:ruc', asyncHandler(consultarRucApi));
router.put('/:id', asyncHandler(updateProveedor));
router.delete('/:id', asyncHandler(deleteProveedor));

module.exports = router;
