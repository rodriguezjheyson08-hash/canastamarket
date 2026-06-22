/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/categoriasController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const pool = require('../db/pool');
const {
  categoryAvailabilitySql,
  isRemovedCategoryName
} = require('../utils/catalogAvailability');

// CONTROLADOR BACKEND: list Categorias procesa request/respuesta de este flujo.
const listCategorias = async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, descripcion
       FROM categorias c
      WHERE ${categoryAvailabilitySql('c')}
      ORDER BY nombre`
  );
  res.json(rows);
};

// CONTROLADOR BACKEND: create Categoria procesa request/respuesta de este flujo.
const createCategoria = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }
  if (isRemovedCategoryName(nombre)) {
    return res.status(400).json({ message: 'Esta categoría no está disponible.' });
  }

  const [result] = await pool.execute(
    'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
    [nombre, descripcion || null]
  );
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion FROM categorias WHERE id = ?',
    [result.insertId]
  );
  res.status(201).json(rows[0]);
};

// CONTROLADOR BACKEND: update Categoria procesa request/respuesta de este flujo.
const updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (nombre !== undefined && isRemovedCategoryName(nombre)) {
    return res.status(400).json({ message: 'Esta categoría no está disponible.' });
  }

  const [result] = await pool.execute(
    'UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion) WHERE id = ?',
    [nombre || null, descripcion || null, id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Categoría no encontrada.' });
  }

  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion FROM categorias WHERE id = ?',
    [id]
  );
  res.json(rows[0]);
};

// CONTROLADOR BACKEND: delete Categoria procesa request/respuesta de este flujo.
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
