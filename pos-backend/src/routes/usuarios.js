const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  unlockUsuario
} = require('../controllers/usuariosController');

const router = express.Router();

router.use(requireAuth({ type: 'admin', roles: ['ADMINISTRADOR'] }));
router.get('/', asyncHandler(listUsuarios));
router.post('/', asyncHandler(createUsuario));
router.put('/:id', asyncHandler(updateUsuario));
router.put('/:id/unlock', asyncHandler(unlockUsuario));
router.delete('/:id', asyncHandler(deleteUsuario));

module.exports = router;
