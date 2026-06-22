/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/productos.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listProductos,
  createProducto,
  updateProducto,
  deleteProducto
} = require('../controllers/productosController');

const router = express.Router();

// RUTA BACKEND: endpoint GET '/'; conecta la URL con el controlador correspondiente.
router.get('/', asyncHandler(listProductos));
router.post('/', requireAuth({ type: 'admin' }), asyncHandler(createProducto));
router.put('/:id', requireAuth({ type: 'admin' }), asyncHandler(updateProducto));
// RUTA BACKEND: endpoint DELETE '/:id'; conecta la URL con el controlador correspondiente.
router.delete('/:id', requireAuth({ type: 'admin' }), asyncHandler(deleteProducto));

module.exports = router;
