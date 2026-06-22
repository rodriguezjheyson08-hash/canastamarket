/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/categorias.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria
} = require('../controllers/categoriasController');

const router = express.Router();

// RUTA BACKEND: endpoint GET '/'; conecta la URL con el controlador correspondiente.
router.get('/', asyncHandler(listCategorias));
router.post('/', requireAuth({ type: 'admin' }), asyncHandler(createCategoria));
router.put('/:id', requireAuth({ type: 'admin' }), asyncHandler(updateCategoria));
// RUTA BACKEND: endpoint DELETE '/:id'; conecta la URL con el controlador correspondiente.
router.delete('/:id', requireAuth({ type: 'admin' }), asyncHandler(deleteCategoria));

module.exports = router;
