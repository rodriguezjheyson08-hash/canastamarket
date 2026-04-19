const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { getTiendaConfig, updateTiendaConfig } = require('../controllers/tiendaController');

const router = express.Router();

router.get('/config', asyncHandler(getTiendaConfig));
router.put('/config', requireAuth({ type: 'admin' }), asyncHandler(updateTiendaConfig));

module.exports = router;
