const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { login } = require('../controllers/authController');
const { createSimpleRateLimit } = require('../utils/simpleRateLimit');

const router = express.Router();
const authLoginRateLimit = createSimpleRateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: 'auth-login' });

router.post('/login', authLoginRateLimit, asyncHandler(login));

module.exports = router;
