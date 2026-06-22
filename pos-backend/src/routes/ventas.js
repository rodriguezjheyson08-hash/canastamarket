/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/ventas.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// RUTA BACKEND - VENTAS:
// Expone endpoints para listar y crear ventas desde el frontend.
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listVentas,
  createVenta
} = require('../controllers/ventasController');

const router = express.Router();

// RUTA BACKEND: endpoint GET '/'; conecta la URL con el controlador correspondiente.
router.get('/', requireAuth({ type: 'admin' }), asyncHandler(listVentas));
router.post('/', requireAuth({ type: 'admin' }), asyncHandler(createVenta));

module.exports = router;
