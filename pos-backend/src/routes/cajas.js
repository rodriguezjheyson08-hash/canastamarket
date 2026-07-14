const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  getCajaActual,
  abrirCaja,
  cerrarCaja,
  listCajas,
  asignarFondoCaja,
  listFondosCaja
} = require('../controllers/cajasController');

const router = express.Router();
router.use(requireAuth({ type: 'admin' }));
router.get('/actual', asyncHandler(getCajaActual));
router.get('/', asyncHandler(listCajas));
router.get('/fondos', asyncHandler(listFondosCaja));
router.post('/fondos', asyncHandler(asignarFondoCaja));
router.post('/abrir', asyncHandler(abrirCaja));
router.post('/cerrar', asyncHandler(cerrarCaja));

module.exports = router;
