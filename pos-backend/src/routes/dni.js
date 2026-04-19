const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { getPersonaPorDni } = require('../controllers/dniController');

const router = express.Router();

router.get('/:dni', requireAuth({ type: 'admin' }), asyncHandler(getPersonaPorDni));

module.exports = router;
