const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { getCajaActual, abrirCaja, cerrarCaja, listCajas } = require('../controllers/cajasController');

const router = express.Router();
router.use(requireAuth({ type: 'admin' }));
router.get('/actual', asyncHandler(getCajaActual));
router.get('/', asyncHandler(listCajas));
router.post('/abrir', asyncHandler(abrirCaja));
router.post('/cerrar', asyncHandler(cerrarCaja));

module.exports = router;
