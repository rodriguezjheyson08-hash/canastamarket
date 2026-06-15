/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/configuracion.js
 * QUE HACE: Define endpoints HTTP para configuracion del sistema.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  getConfiguracionSistema,
  saveConfiguracionSistema
} = require('../controllers/configuracionController');

const router = express.Router();

// RUTA BACKEND: solo administradores pueden leer o guardar Personalizacion y Boleta.
router.use(requireAuth({ type: 'admin', roles: ['ADMINISTRADOR'] }));
router.get('/', asyncHandler(getConfiguracionSistema));
router.put('/', asyncHandler(saveConfiguracionSistema));

module.exports = router;
