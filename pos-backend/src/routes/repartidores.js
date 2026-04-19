const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listRepartidores,
  reportRepartidorUbicacion,
  getPedidoActivoRepartidor,
  getRepartidorDashboard,
  updateRepartidorEstado,
  updateRepartidorProfile
} = require('../controllers/repartosController');

const router = express.Router();

router.get('/', requireAuth({ type: 'admin' }), asyncHandler(listRepartidores));
router.get('/:id/dashboard', requireAuth({ types: ['admin', 'repartidor'] }), asyncHandler(getRepartidorDashboard));
router.get('/:id/pedido-activo', requireAuth({ types: ['admin', 'repartidor'] }), asyncHandler(getPedidoActivoRepartidor));
router.put('/:id/perfil', requireAuth({ types: ['admin', 'repartidor'] }), asyncHandler(updateRepartidorProfile));
router.post('/:id/ubicacion', requireAuth({ types: ['admin', 'repartidor'] }), asyncHandler(reportRepartidorUbicacion));
router.put('/:id/estado', requireAuth({ types: ['admin', 'repartidor'] }), asyncHandler(updateRepartidorEstado));

module.exports = router;
