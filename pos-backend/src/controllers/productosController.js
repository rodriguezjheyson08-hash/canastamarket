/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/productosController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const pool = require('../db/pool');
const {
  hasRemovedProductTerm,
  isRemovedCategoryName,
  productAvailabilitySql
} = require('../utils/catalogAvailability');
const {
  validateCodigoBarras,
  validateProductoNumbers
} = require('../features/productos/validators');

// CONTROLADOR BACKEND: map Producto procesa request/respuesta de este flujo.
const mapProducto = (row) => ({
  id: row.id,
  nombre: row.nombre,
  descripcion: row.descripcion,
  precioVenta: Number(row.precio_venta),
  precioCompra: row.precio_compra !== null ? Number(row.precio_compra) : null,
  codigoBarras: row.codigo_barras,
  stockActual: Number(row.stock_actual),
  stockMinimo: Number(row.stock_minimo),
  categoriaId: row.categoria_id,
  imagen: row.imagen,
  activo: row.activo === 1
});

// CONTROLADOR BACKEND: ensure Codigo Barras Unique procesa request/respuesta de este flujo.
const ensureCodigoBarrasUnique = async (codigoBarras, productoId = null) => {
  if (!codigoBarras) return;
  const params = productoId ? [codigoBarras, productoId] : [codigoBarras];
  const [rows] = await pool.query(
    `SELECT id FROM productos
      WHERE codigo_barras = ?
        AND activo = 1
        ${productoId ? 'AND id <> ?' : ''}
      LIMIT 1`,
    params
  );
  if (rows.length > 0) {
    throw new Error('El código de barras ya está registrado en otro producto.');
  }
};

// CONTROLADOR BACKEND: fetch Categoria Name procesa request/respuesta de este flujo.
const fetchCategoriaName = async (categoriaId) => {
  if (categoriaId === undefined || categoriaId === null || categoriaId === '') return null;
  const [rows] = await pool.query('SELECT nombre FROM categorias WHERE id = ?', [categoriaId]);
  return rows[0]?.nombre ?? null;
};

// CONTROLADOR BACKEND: validate Producto Available procesa request/respuesta de este flujo.
const validateProductoAvailable = async ({ nombre, descripcion, categoriaId }) => {
  if (hasRemovedProductTerm(nombre, descripcion)) {
    throw new Error('Este producto no está disponible para el MVP.');
  }

  const categoriaNombre = await fetchCategoriaName(categoriaId);
  if (isRemovedCategoryName(categoriaNombre)) {
    throw new Error('La categoría seleccionada no está disponible.');
  }
};

// CONTROLADOR BACKEND: fetch Producto For Update procesa request/respuesta de este flujo.
const fetchProductoForUpdate = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.descripcion, p.codigo_barras, p.categoria_id, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
};

// CONTROLADOR BACKEND: list Productos procesa request/respuesta de este flujo.
const listProductos = async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.descripcion, p.precio_venta, p.precio_compra, p.codigo_barras,
            p.stock_actual, p.stock_minimo, p.categoria_id, p.imagen, p.activo
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE ${productAvailabilitySql('p', 'c')}
      ORDER BY p.nombre`
  );
  res.json(rows.map(mapProducto));
};

// CONTROLADOR BACKEND: create Producto procesa request/respuesta de este flujo.
const createProducto = async (req, res) => {
  const {
    nombre,
    descripcion,
    precioVenta,
    precioCompra,
    codigoBarras,
    stockActual,
    stockMinimo,
    categoriaId,
    imagen,
    activo
  } = req.body;

  if (!nombre || precioVenta === undefined || categoriaId === undefined) {
    return res.status(400).json({ message: 'Nombre, precioVenta y categoriaId son obligatorios.' });
  }

  let numericValues;
  let codigoBarrasValue;
  try {
    numericValues = validateProductoNumbers({ precioVenta, precioCompra, stockActual, stockMinimo }, { creating: true });
    codigoBarrasValue = validateCodigoBarras(codigoBarras);
    await ensureCodigoBarrasUnique(codigoBarrasValue);
    await validateProductoAvailable({ nombre, descripcion, categoriaId });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const [result] = await pool.execute(
    `INSERT INTO productos
      (nombre, descripcion, precio_venta, precio_compra, codigo_barras, stock_actual, stock_minimo, categoria_id, imagen, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      descripcion || null,
      numericValues.precioVentaValue,
      numericValues.precioCompraValue,
      codigoBarrasValue,
      numericValues.stockActualValue ?? 0,
      numericValues.stockMinimoValue ?? 0,
      categoriaId,
      imagen || null,
      activo === false ? 0 : 1
    ]
  );

  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio_venta, precio_compra, codigo_barras, stock_actual, stock_minimo, categoria_id, imagen, activo FROM productos WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json(mapProducto(rows[0]));
};

// CONTROLADOR BACKEND: update Producto procesa request/respuesta de este flujo.
const updateProducto = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    descripcion,
    precioVenta,
    precioCompra,
    codigoBarras,
    stockActual,
    stockMinimo,
    categoriaId,
    imagen,
    activo
  } = req.body;

  let numericValues;
  let codigoBarrasValue;
  try {
    numericValues = validateProductoNumbers({ precioVenta, precioCompra, stockActual, stockMinimo });
    codigoBarrasValue = validateCodigoBarras(codigoBarras);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const existingProducto = await fetchProductoForUpdate(id);
  if (!existingProducto) {
    return res.status(404).json({ message: 'Producto no encontrado.' });
  }

  try {
    await ensureCodigoBarrasUnique(codigoBarrasValue, id);
    await validateProductoAvailable({
      nombre: nombre ?? existingProducto.nombre,
      descripcion: descripcion ?? existingProducto.descripcion,
      categoriaId: categoriaId ?? existingProducto.categoria_id
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  await pool.execute(
    `UPDATE productos SET
      nombre = COALESCE(?, nombre),
      descripcion = COALESCE(?, descripcion),
      precio_venta = COALESCE(?, precio_venta),
      precio_compra = COALESCE(?, precio_compra),
      codigo_barras = ?,
      stock_actual = COALESCE(?, stock_actual),
      stock_minimo = COALESCE(?, stock_minimo),
      categoria_id = COALESCE(?, categoria_id),
      imagen = COALESCE(?, imagen),
      activo = COALESCE(?, activo)
    WHERE id = ?`,
    [
      nombre || null,
      descripcion || null,
      numericValues.precioVentaValue,
      numericValues.precioCompraValue,
      codigoBarras === undefined ? existingProducto.codigo_barras : codigoBarrasValue,
      numericValues.stockActualValue,
      numericValues.stockMinimoValue,
      categoriaId ?? null,
      imagen || null,
      activo === undefined ? null : activo ? 1 : 0,
      id
    ]
  );

  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio_venta, precio_compra, codigo_barras, stock_actual, stock_minimo, categoria_id, imagen, activo FROM productos WHERE id = ?',
    [id]
  );

  res.json(mapProducto(rows[0]));
};

// CONTROLADOR BACKEND: delete Producto procesa request/respuesta de este flujo.
const deleteProducto = async (req, res) => {
  const { id } = req.params;
  let result;
  try {
    [result] = await pool.execute('DELETE FROM productos WHERE id = ?', [id]);
  } catch (error) {
    if (error?.code !== 'ER_ROW_IS_REFERENCED_2' && error?.code !== 'ER_ROW_IS_REFERENCED') {
      throw error;
    }
    [result] = await pool.execute(
      `UPDATE productos
          SET activo = 0,
              codigo_barras = NULL,
              imagen = NULL
        WHERE id = ?`,
      [id]
    );
  }

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Producto no encontrado.' });
  }

  res.status(204).send();
};

module.exports = {
  listProductos,
  createProducto,
  updateProducto,
  deleteProducto
};
