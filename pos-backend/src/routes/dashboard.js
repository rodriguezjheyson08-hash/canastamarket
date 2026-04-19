const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const { getStats } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', requireAuth({ type: 'admin' }), asyncHandler(getStats));

module.exports = router;
