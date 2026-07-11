const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listMovimientosInventario,
  registrarPerdida,
  listAuditoria
} = require('../controllers/inventarioController');

const router = express.Router();

router.use(requireAuth({ type: 'admin', roles: ['ADMINISTRADOR'] }));
router.get('/movimientos', asyncHandler(listMovimientosInventario));
router.post('/perdidas', asyncHandler(registrarPerdida));
router.get('/auditoria', asyncHandler(listAuditoria));

module.exports = router;
