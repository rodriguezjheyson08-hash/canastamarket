/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/usuariosController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const pool = require('../db/pool');
const { normalizePermisos } = require('../utils/permisos');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { hashPassword } = require('../utils/passwords');
const { isStrongPassword, PASSWORD_MESSAGE } = require('../features/passwordReset/security');

let usuariosColumnsChecked = false;

// CONTROLADOR BACKEND: ensure Column procesa request/respuesta de este flujo.
const ensureColumn = async (runner, columnName, ddl) => {
  const [rows] = await runner.query(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [columnName]
  );
  if (rows.length > 0) return;
  await runner.query(ddl);
};

// CONTROLADOR BACKEND: ensure Usuarios Optional Columns procesa request/respuesta de este flujo.
const ensureUsuariosOptionalColumns = async (runner = pool) => {
  await ensurePasswordColumnSchema({ tableName: 'usuarios', runner });
  if (usuariosColumnsChecked) return;

  await ensureColumn(runner, 'dni', 'ALTER TABLE usuarios ADD COLUMN dni VARCHAR(8) NULL');
  await ensureColumn(runner, 'telefono', 'ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(9) NULL');
  await ensureColumn(runner, 'email', 'ALTER TABLE usuarios ADD COLUMN email VARCHAR(180) NULL');
  await ensureColumn(runner, 'foto_url', 'ALTER TABLE usuarios ADD COLUMN foto_url MEDIUMTEXT NULL');
  await ensureColumn(runner, 'permisos', 'ALTER TABLE usuarios ADD COLUMN permisos LONGTEXT NULL');
  await ensureColumn(runner, 'failed_attempts', 'ALTER TABLE usuarios ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0');
  await ensureColumn(runner, 'lockouts', 'ALTER TABLE usuarios ADD COLUMN lockouts INT NOT NULL DEFAULT 0');
  await ensureColumn(runner, 'lock_until', 'ALTER TABLE usuarios ADD COLUMN lock_until DATETIME NULL');
  await ensureColumn(runner, 'is_blocked', 'ALTER TABLE usuarios ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn(runner, 'is_active', 'ALTER TABLE usuarios ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');

  usuariosColumnsChecked = true;
};

const usuarioSelect = `
  id, nombre_usuario, nombre_completo, rol, dni, telefono, email, foto_url,
  permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active, created_at
`;

// CONTROLADOR BACKEND: map Usuario Row procesa request/respuesta de este flujo.
const mapUsuarioRow = (row) => ({
  id: row.id,
  nombre_usuario: row.nombre_usuario,
  nombre_completo: row.nombre_completo,
  rol: row.rol,
  dni: row.dni,
  telefono: row.telefono,
  email: row.email,
  foto_url: row.foto_url,
  permisos: normalizePermisos(row.rol, row.permisos),
  failed_attempts: Number(row.failed_attempts || 0),
  lockouts: Number(row.lockouts || 0),
  lock_until: row.lock_until,
  is_blocked: row.is_blocked,
  is_active: row.is_active,
  created_at: row.created_at
});

// CONTROLADOR BACKEND: is Telefono Valido procesa request/respuesta de este flujo.
const isTelefonoValido = (telefono) => /^\d{9}$/.test(String(telefono || ''));
const isDniValido = (dni) => /^\d{8}$/.test(String(dni || ''));
const isEmailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
// CONTROLADOR BACKEND: is Rol Valido procesa request/respuesta de este flujo.
const isRolValido = (rol) => ['ADMINISTRADOR', 'CAJERO'].includes(String(rol || '').toUpperCase());

const countAdministradores = async (excludeId = null) => {
  const params = [];
  let sql = "SELECT COUNT(*) AS total FROM usuarios WHERE UPPER(rol) = 'ADMINISTRADOR'";
  if (excludeId !== null && excludeId !== undefined) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  const [rows] = await pool.query(sql, params);
  return Number(rows[0]?.total || 0);
};

const emailEnUso = async (email, excludeId = null) => {
  const params = [email];
  let sql = 'SELECT id FROM usuarios WHERE LOWER(email) = ?';
  if (excludeId !== null && excludeId !== undefined) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
};

const normalizeUsuarioPayload = (body = {}) => {
  const rol = String(body.rol || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  const dni = String(body.dni || '').replace(/\D/g, '');
  const telefono = String(body.telefono || '').replace(/\D/g, '');

  return {
    nombreUsuario: String(body.nombreUsuario || '').trim(),
    nombreCompleto: String(body.nombreCompleto || '').trim(),
    rol,
    password: String(body.password || ''),
    dni: dni || null,
    telefono: telefono || null,
    email: email || null,
    fotoUrl: body.fotoUrl || null,
    permisos: body.permisos || null,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined
  };
};

// CONTROLADOR BACKEND: validate Usuario Payload procesa request/respuesta de este flujo.
const validateUsuarioPayload = (data, { creating = false } = {}) => {
  if (!data.nombreUsuario || !data.nombreCompleto || !data.rol) {
    return 'Usuario, nombre completo y rol son obligatorios.';
  }
  if (!data.email || !isEmailValido(data.email)) {
    return 'El correo válido es obligatorio para recuperar la contraseña.';
  }
  if (creating && !data.password) {
    return 'La contraseña es obligatoria.';
  }
  if (data.password && !isStrongPassword(data.password)) {
    return PASSWORD_MESSAGE;
  }
  if (!isRolValido(data.rol)) {
    return 'Rol no válido.';
  }
  if (data.dni && !isDniValido(data.dni)) {
    return 'El DNI debe tener 8 dígitos.';
  }
  if (data.telefono && !isTelefonoValido(data.telefono)) {
    return 'El teléfono debe tener 9 dígitos.';
  }
  if (data.email && !isEmailValido(data.email)) {
    return 'El correo no es válido.';
  }
  return '';
};

// CONTROLADOR BACKEND: list Usuarios procesa request/respuesta de este flujo.
const listUsuarios = async (_req, res) => {
  await ensureUsuariosOptionalColumns();
  const [rows] = await pool.query(`SELECT ${usuarioSelect} FROM usuarios ORDER BY nombre_usuario`);
  res.json(rows.map(mapUsuarioRow));
};

// CONTROLADOR BACKEND: create Usuario procesa request/respuesta de este flujo.
const createUsuario = async (req, res) => {
  await ensureUsuariosOptionalColumns();
  const data = normalizeUsuarioPayload(req.body);
  const validationError = validateUsuarioPayload(data, { creating: true });
  if (validationError) return res.status(400).json({ message: validationError });
  if (data.rol === 'ADMINISTRADOR' && await countAdministradores() > 0) {
    return res.status(409).json({ message: 'Solo puede existir un administrador en el sistema.' });
  }
  if (await emailEnUso(data.email)) {
    return res.status(409).json({ message: 'Ya existe un usuario con ese correo.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO usuarios
        (nombre_usuario, nombre_completo, rol, password, dni, telefono, email, foto_url, permisos, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nombreUsuario,
        data.nombreCompleto,
        data.rol,
        hashPassword(data.password),
        data.dni,
        data.telefono,
        data.email,
        data.fotoUrl,
        JSON.stringify(normalizePermisos(data.rol, data.permisos)),
        data.isActive === false ? 0 : 1
      ]
    );

    const [rows] = await pool.query(`SELECT ${usuarioSelect} FROM usuarios WHERE id = ?`, [result.insertId]);
    res.status(201).json(mapUsuarioRow(rows[0]));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un usuario con ese nombre.' });
    }
    throw error;
  }
};

// CONTROLADOR BACKEND: update Usuario procesa request/respuesta de este flujo.
const updateUsuario = async (req, res) => {
  await ensureUsuariosOptionalColumns();
  const { id } = req.params;
  const data = normalizeUsuarioPayload(req.body);
  const validationError = validateUsuarioPayload(data, { creating: false });
  if (validationError) return res.status(400).json({ message: validationError });
  if (await emailEnUso(data.email, id)) {
    return res.status(409).json({ message: 'Ya existe un usuario con ese correo.' });
  }

  const [currentRows] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
  if (currentRows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
  const currentRol = String(currentRows[0].rol || '').toUpperCase();
  const otherAdmins = await countAdministradores(id);
  if (data.rol === 'ADMINISTRADOR' && otherAdmins > 0) {
    return res.status(409).json({ message: 'Solo puede existir un administrador en el sistema.' });
  }
  if (currentRol === 'ADMINISTRADOR' && data.rol !== 'ADMINISTRADOR' && otherAdmins === 0) {
    return res.status(409).json({ message: 'Debe existir un administrador activo en el sistema.' });
  }
  if (currentRol === 'ADMINISTRADOR' && data.isActive === false && otherAdmins === 0) {
    return res.status(409).json({ message: 'Debe existir un administrador activo en el sistema.' });
  }

  const hasPassword = data.password.trim() !== '';
  const hasPermisos = Object.prototype.hasOwnProperty.call(req.body || {}, 'permisos');
  const isActiveValue = data.isActive === undefined ? null : (data.isActive ? 1 : 0);

  try {
    const [result] = await pool.execute(
      `UPDATE usuarios SET
        nombre_usuario = ?,
        nombre_completo = ?,
        rol = ?,
        password = COALESCE(?, password),
        dni = ?,
        telefono = ?,
        email = ?,
        foto_url = COALESCE(?, foto_url),
        permisos = COALESCE(?, permisos),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        data.nombreUsuario,
        data.nombreCompleto,
        data.rol,
        hasPassword ? hashPassword(data.password) : null,
        data.dni,
        data.telefono,
        data.email,
        data.fotoUrl,
        hasPermisos ? JSON.stringify(normalizePermisos(data.rol, data.permisos)) : null,
        isActiveValue,
        id
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
    const [rows] = await pool.query(`SELECT ${usuarioSelect} FROM usuarios WHERE id = ?`, [id]);
    res.json(mapUsuarioRow(rows[0]));
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un usuario con ese nombre.' });
    }
    throw error;
  }
};

// CONTROLADOR BACKEND: delete Usuario procesa request/respuesta de este flujo.
const deleteUsuario = async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
  res.status(204).send();
};

// CONTROLADOR BACKEND: unlock Usuario procesa request/respuesta de este flujo.
const unlockUsuario = async (req, res) => {
  await ensureUsuariosOptionalColumns();
  const { id } = req.params;
  const [result] = await pool.execute(
    'UPDATE usuarios SET is_blocked = 0, failed_attempts = 0, lockouts = 0, lock_until = NULL WHERE id = ?',
    [id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
  const [rows] = await pool.query(`SELECT ${usuarioSelect} FROM usuarios WHERE id = ?`, [id]);
  res.json(mapUsuarioRow(rows[0]));
};

module.exports = {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  unlockUsuario
};
