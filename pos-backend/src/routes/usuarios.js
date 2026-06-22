/*
 * MAPA DEL ARCHIVO: RUTA BACKEND
 * UBICACION: pos-backend/src/routes/usuarios.js
 * QUE HACE: Define endpoints HTTP y los conecta con controllers.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
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

// RUTA BACKEND: endpoint USE requireAuth({ type: 'admin'; conecta la URL con el controlador correspondiente.
router.use(requireAuth({ type: 'admin', roles: ['ADMINISTRADOR'] }));
router.get('/', asyncHandler(listUsuarios));
router.post('/', asyncHandler(createUsuario));
// RUTA BACKEND: endpoint PUT '/:id'; conecta la URL con el controlador correspondiente.
router.put('/:id', asyncHandler(updateUsuario));
router.put('/:id/unlock', asyncHandler(unlockUsuario));
router.delete('/:id', asyncHandler(deleteUsuario));

module.exports = router;
