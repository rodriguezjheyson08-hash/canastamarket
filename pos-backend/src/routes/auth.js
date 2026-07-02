/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/auth.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getCurrentUser, googleLogin, login } = require('../controllers/authController');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { requireAuth } = require('../utils/requireAuth');
const { requestPasswordReset, verifyPasswordResetCode, completePasswordReset } = require('../controllers/passwordResetController');
const { createSimpleRateLimit } = require('../utils/simpleRateLimit');

const router = express.Router();
const authLoginRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: 'auth-login' });
const resetRequestRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 5, keyPrefix: 'password-reset-request' });
const resetConfirmRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: 'password-reset-confirm' });

// RUTA BACKEND: endpoint POST '/login'; conecta la URL con el controlador correspondiente.
router.post('/login', authLoginRateLimit, asyncHandler(login));
router.post('/google', authLoginRateLimit, asyncHandler(googleLogin));
router.get('/me', requireAuth({ type: 'admin' }), asyncHandler(getCurrentUser));
router.post('/password-reset/request', resetRequestRateLimit, asyncHandler(requestPasswordReset));
router.post('/password-reset/verify', resetConfirmRateLimit, asyncHandler(verifyPasswordResetCode));
router.post('/password-reset/complete', requireAuth({ type: 'password_reset' }), asyncHandler(completePasswordReset));

module.exports = router;
