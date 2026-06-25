/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/auth.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getCurrentUser, login, loginWithGoogle } = require('../controllers/authController');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { requireAuth } = require('../utils/requireAuth');
const { createSimpleRateLimit } = require('../utils/simpleRateLimit');

const router = express.Router();
const authLoginRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: 'auth-login' });

// RUTA BACKEND: endpoint POST '/login'; conecta la URL con el controlador correspondiente.
router.post('/login', authLoginRateLimit, asyncHandler(login));
router.post('/google', authLoginRateLimit, asyncHandler(loginWithGoogle));
router.get('/me', requireAuth({ type: 'admin' }), asyncHandler(getCurrentUser));

module.exports = router;
