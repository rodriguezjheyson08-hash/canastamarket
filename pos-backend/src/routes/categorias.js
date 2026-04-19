const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria
} = require('../controllers/categoriasController');

const router = express.Router();

router.get('/', asyncHandler(listCategorias));
router.post('/', requireAuth({ type: 'admin' }), asyncHandler(createCategoria));
router.put('/:id', requireAuth({ type: 'admin' }), asyncHandler(updateCategoria));
router.delete('/:id', requireAuth({ type: 'admin' }), asyncHandler(deleteCategoria));

module.exports = router;
