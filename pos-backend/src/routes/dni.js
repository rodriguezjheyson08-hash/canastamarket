/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/dni.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { getPersonaPorDni } = require('../controllers/dniController');

const router = express.Router();

// RUTA BACKEND: endpoint GET '/:dni'; conecta la URL con el controlador correspondiente.
router.get('/:dni', requireAuth({ type: 'admin' }), asyncHandler(getPersonaPorDni));

module.exports = router;
