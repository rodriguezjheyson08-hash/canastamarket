const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { registerCliente, loginCliente, getClienteActual, updateClienteActual } = require('../controllers/clientesController');

const router = express.Router();
router.post('/register', asyncHandler(registerCliente));
router.post('/login', asyncHandler(loginCliente));
router.get('/me', requireAuth({ type: 'cliente' }), asyncHandler(getClienteActual));
router.put('/me', requireAuth({ type: 'cliente' }), asyncHandler(updateClienteActual));
module.exports = router;
