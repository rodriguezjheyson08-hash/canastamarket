/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/dashboard.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { getStats } = require('../controllers/dashboardController');

const router = express.Router();

// RUTA BACKEND: endpoint GET '/stats'; conecta la URL con el controlador correspondiente.
router.get('/stats', requireAuth({ type: 'admin' }), asyncHandler(getStats));

module.exports = router;
