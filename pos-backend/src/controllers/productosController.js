const pool = require('../db/pool');

const mapProducto = (row) => ({
  id: row.id,
  nombre: row.nombre,
  descripcion: row.descripcion,
  precioVenta: Number(row.precio_venta),
  precioCompra: row.precio_compra !== null ? Number(row.precio_compra) : null,
  stockActual: Number(row.stock_actual),
  stockMinimo: Number(row.stock_minimo),
  categoriaId: row.categoria_id,
  imagen: row.imagen,
  activo: row.activo === 1
});

const listProductos = async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, categoria_id, imagen, activo FROM productos ORDER BY nombre'
  );
  res.json(rows.map(mapProducto));
};

const createProducto = async (req, res) => {
  const {
    nombre,
    descripcion,
    precioVenta,
    precioCompra,
    stockActual,
    stockMinimo,
    categoriaId,
    imagen,
    activo
  } = req.body;

  if (!nombre || precioVenta === undefined || categoriaId === undefined) {
    return res.status(400).json({ message: 'Nombre, precioVenta y categoriaId son obligatorios.' });
  }

  const [result] = await pool.execute(
    `INSERT INTO productos
      (nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, categoria_id, imagen, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      descripcion || null,
      precioVenta,
      precioCompra ?? null,
      stockActual ?? 0,
      stockMinimo ?? 0,
      categoriaId,
      imagen || null,
      activo === false ? 0 : 1
    ]
  );

  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, categoria_id, imagen, activo FROM productos WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json(mapProducto(rows[0]));
};

const updateProducto = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    descripcion,
    precioVenta,
    precioCompra,
    stockActual,
    stockMinimo,
    categoriaId,
    imagen,
    activo
  } = req.body;

  const [result] = await pool.execute(
    `UPDATE productos SET
      nombre = COALESCE(?, nombre),
      descripcion = COALESCE(?, descripcion),
      precio_venta = COALESCE(?, precio_venta),
      precio_compra = COALESCE(?, precio_compra),
      stock_actual = COALESCE(?, stock_actual),
      stock_minimo = COALESCE(?, stock_minimo),
      categoria_id = COALESCE(?, categoria_id),
      imagen = COALESCE(?, imagen),
      activo = COALESCE(?, activo)
    WHERE id = ?`,
    [
      nombre || null,
      descripcion || null,
      precioVenta ?? null,
      precioCompra ?? null,
      stockActual ?? null,
      stockMinimo ?? null,
      categoriaId ?? null,
      imagen || null,
      activo === undefined ? null : activo ? 1 : 0,
      id
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Producto no encontrado.' });
  }

  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, categoria_id, imagen, activo FROM productos WHERE id = ?',
    [id]
  );

  res.json(mapProducto(rows[0]));
};

const deleteProducto = async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.execute('DELETE FROM productos WHERE id = ?', [id]);

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
