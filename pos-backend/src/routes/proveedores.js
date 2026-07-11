/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/proveedores.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
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
  recibirPedidoCompra,
  deletePedidoCompra,
  deletePedidosCompraBatch,
  downloadPedidoCsv,
  downloadPedidoPdf
} = require('../controllers/proveedoresController');

const router = express.Router();

// LOGICA BACKEND: todas las rutas de proveedores requieren usuario administrador autenticado.
router.use(requireAuth({ type: 'admin' }));

// RUTA BACKEND: pedidos de compra del modulo proveedores.
router.get('/pedidos', asyncHandler(listPedidosCompra));
router.post('/pedidos', asyncHandler(createPedidoCompra));
router.post('/pedidos/delete-batch', asyncHandler(deletePedidosCompraBatch));
router.get('/pedidos/:id/csv', asyncHandler(downloadPedidoCsv));
router.get('/pedidos/:id/pdf', asyncHandler(downloadPedidoPdf));
router.patch('/pedidos/:id/recibir', asyncHandler(recibirPedidoCompra));
// RUTA BACKEND: endpoint GET '/pedidos/:id'; conecta la URL con el controlador correspondiente.
router.get('/pedidos/:id', asyncHandler(getPedidoCompra));
router.delete('/pedidos/:id', asyncHandler(deletePedidoCompra));

// RUTA BACKEND: CRUD de proveedores y consulta externa de RUC.
router.get('/', asyncHandler(listProveedores));
router.post('/', asyncHandler(createProveedor));
router.get('/ruc/:ruc', asyncHandler(getProveedorByRuc));
// RUTA BACKEND: endpoint GET '/consulta-ruc/:ruc'; conecta la URL con el controlador correspondiente.
router.get('/consulta-ruc/:ruc', asyncHandler(consultarRucApi));
router.put('/:id', asyncHandler(updateProveedor));
router.delete('/:id', asyncHandler(deleteProveedor));

module.exports = router;
