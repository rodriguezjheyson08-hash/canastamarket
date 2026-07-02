const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { registerCliente, loginCliente, googleLoginCliente, getClienteActual, updateClienteActual } = require('../controllers/clientesController');
const { createSimpleRateLimit } = require('../utils/simpleRateLimit');

const router = express.Router();
const authRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 30 });
router.post('/register', asyncHandler(registerCliente));
router.post('/login', authRateLimit, asyncHandler(loginCliente));
router.post('/google', authRateLimit, asyncHandler(googleLoginCliente));
router.get('/me', requireAuth({ type: 'cliente' }), asyncHandler(getClienteActual));
router.put('/me', requireAuth({ type: 'cliente' }), asyncHandler(updateClienteActual));
module.exports = router;
