/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/categoriasController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 */
const pool = require('../db/pool');
const {
  categoryAvailabilitySql,
  isRemovedCategoryName
} = require('../utils/catalogAvailability');

const DUPLICATE_CATEGORY_MESSAGE = 'Ya existe una categoría con ese nombre.';
const CATEGORY_WITH_PRODUCTS_MESSAGE =
  'No se puede cambiar el nombre porque esta categoría tiene productos asociados. Solo se permite renombrar categorías vacías.';

const normalizeCategoriaName = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const findCategoriaById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion FROM categorias WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const hasCategoriaWithName = async (nombre, excludeId = null) => {
  const params = [];
  let sql = 'SELECT id, nombre FROM categorias';

  if (excludeId !== null && excludeId !== undefined) {
    sql += ' WHERE id <> ?';
    params.push(excludeId);
  }

  const [rows] = await pool.query(sql, params);
  const normalized = normalizeCategoriaName(nombre);
  return rows.some((row) => normalizeCategoriaName(row.nombre) === normalized);
};

const countProductosByCategoria = async (categoriaId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?',
    [categoriaId]
  );
  return Number(rows[0]?.total || 0);
};

const listCategorias = async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, descripcion
       FROM categorias c
      WHERE ${categoryAvailabilitySql('c')}
      ORDER BY nombre`
  );
  res.json(rows);
};

const createCategoria = async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  const descripcion = req.body?.descripcion || null;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }
  if (isRemovedCategoryName(nombre)) {
    return res.status(400).json({ message: 'Esta categoría no está disponible.' });
  }
  if (await hasCategoriaWithName(nombre)) {
    return res.status(409).json({ message: DUPLICATE_CATEGORY_MESSAGE });
  }

  const [result] = await pool.execute(
    'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion]
  );
  const created = await findCategoriaById(result.insertId);
  res.status(201).json(created);
};

const updateCategoria = async (req, res) => {
  const id = Number(req.params.id);
  const nombre = req.body?.nombre === undefined ? undefined : String(req.body.nombre || '').trim();
  const descripcion = req.body?.descripcion || null;

  const currentCategoria = await findCategoriaById(id);
  if (!currentCategoria) {
    return res.status(404).json({ message: 'Categoría no encontrada.' });
  }

  if (nombre !== undefined && !nombre) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }
  if (nombre !== undefined && isRemovedCategoryName(nombre)) {
    return res.status(400).json({ message: 'Esta categoría no está disponible.' });
  }

  const nombreCambia = nombre !== undefined && normalizeCategoriaName(nombre) !== normalizeCategoriaName(currentCategoria.nombre);
  if (nombreCambia) {
    if (await hasCategoriaWithName(nombre, id)) {
      return res.status(409).json({ message: DUPLICATE_CATEGORY_MESSAGE });
    }

    const totalProductos = await countProductosByCategoria(id);
    if (totalProductos > 0) {
      return res.status(409).json({ message: CATEGORY_WITH_PRODUCTS_MESSAGE });
    }
  }

  await pool.execute(
    'UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion) WHERE id = ?',
    [nombre || null, descripcion, id]
  );

  const updated = await findCategoriaById(id);
  res.json(updated);
};

const deleteCategoria = async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.execute('DELETE FROM categorias WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Categoría no encontrada.' });
  }

  res.status(204).send();
};

module.exports = {
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria
};
