const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { registerCliente, registerClienteGoogle, loginCliente, updateCliente } = require('../controllers/clientesController');
const { createSimpleRateLimit } = require('../utils/simpleRateLimit');

const router = express.Router();
const clientesLoginRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 12, keyPrefix: 'clientes-login' });
const clientesRegisterRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 8, keyPrefix: 'clientes-register' });

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.post('/register', clientesRegisterRateLimit, asyncHandler(registerCliente));
router.post('/google', clientesRegisterRateLimit, asyncHandler(registerClienteGoogle));
router.post('/login', clientesLoginRateLimit, asyncHandler(loginCliente));
router.put('/:id', requireAuth({ types: ['cliente', 'admin'] }), asyncHandler(updateCliente));

module.exports = router;
