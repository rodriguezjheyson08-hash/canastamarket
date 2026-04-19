const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/requireAuth');
const {
  listProductos,
  createProducto,
  updateProducto,
  deleteProducto
} = require('../controllers/productosController');

const router = express.Router();

router.get('/', asyncHandler(listProductos));
router.post('/', requireAuth({ type: 'admin' }), asyncHandler(createProducto));
router.put('/:id', requireAuth({ type: 'admin' }), asyncHandler(updateProducto));
router.delete('/:id', requireAuth({ type: 'admin' }), asyncHandler(deleteProducto));

module.exports = router;
