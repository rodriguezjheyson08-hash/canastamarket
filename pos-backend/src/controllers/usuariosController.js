const pool = require('../db/pool');
const { normalizePermisos } = require('../utils/permisos');
const { ensureRepartoSchema } = require('../utils/ensureRepartoSchema');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
const { hashPassword } = require('../utils/passwords');

let usuariosColumnsChecked = false;

const ensureUsuariosOptionalColumns = async (runner = pool) => {
  // Asegurar migración de reparto siempre, incluso si ya se chequearon otras columnas.
  await ensureRepartoSchema(runner);
  await ensurePasswordColumnSchema({ tableName: 'usuarios', runner });
  if (usuariosColumnsChecked) return;

  const [rows] = await runner.query(
    `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME IN ('foto_url', 'permisos', 'dni', 'email')`
  );

  const columnInfo = rows.reduce((acc, row) => {
    acc[String(row.COLUMN_NAME || '').toLowerCase()] = String(row.DATA_TYPE || '').toLowerCase();
    return acc;
  }, {});

  if (!columnInfo.foto_url) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN foto_url MEDIUMTEXT NULL');
  } else if (columnInfo.foto_url !== 'mediumtext' && columnInfo.foto_url !== 'longtext') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN foto_url MEDIUMTEXT NULL');
  }

  if (!columnInfo.permisos) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN permisos LONGTEXT NULL');
  } else {
    const validPermisosTypes = new Set(['json', 'text', 'mediumtext', 'longtext']);
    if (!validPermisosTypes.has(columnInfo.permisos)) {
      await runner.query('ALTER TABLE usuarios MODIFY COLUMN permisos LONGTEXT NULL');
    }
  }

  if (!columnInfo.dni) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN dni VARCHAR(8) NULL');
  } else if (columnInfo.dni !== 'varchar') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN dni VARCHAR(8) NULL');
  }

  if (!columnInfo.email) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN email VARCHAR(180) NULL');
  } else if (columnInfo.email !== 'varchar') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(180) NULL');
  }

  usuariosColumnsChecked = true;
};

const mapUsuarioRow = (row) => ({
  ...row,
  permisos: normalizePermisos(row.rol, row.permisos)
});

const listUsuarios = async (_req, res) => {
  await ensureUsuariosOptionalColumns();
  const [rows] = await pool.query(
    `SELECT id, nombre_usuario, nombre_completo, rol, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active,
            moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at
     FROM usuarios ORDER BY nombre_usuario`
  );
  res.json(rows.map(mapUsuarioRow));
};

const isTelefonoValido = (telefono) => /^\d{9}$/.test(telefono);
const isEmailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const createUsuario = async (req, res) => {
  await ensureUsuariosOptionalColumns();
  const { nombreUsuario, nombreCompleto, rol, password, dni, telefono, email, fotoUrl, permisos, motoMatricula, repartidorEstado } = req.body;

  if (!nombreUsuario || !nombreCompleto || !rol || !password) {
    return res.status(400).json({ message: 'Nombre de usuario, nombre completo, rol y password son obligatorios.' });
  }

  if (dni && !/^\d{8}$/.test(String(dni))) {
    return res.status(400).json({ message: 'El DNI debe tener 8 dígitos.' });
  }

  if (telefono && !isTelefonoValido(String(telefono))) {
    return res.status(400).json({ message: 'El teléfono debe tener 9 dígitos.' });
  }
  if (email && !isEmailValido(email)) {
    return res.status(400).json({ message: 'El correo no es válido.' });
  }

  const permisosValue = JSON.stringify(normalizePermisos(rol, permisos));
  const emailValue = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const motoMatriculaValue = typeof motoMatricula === 'string' ? motoMatricula.trim() : '';
  const repartidorEstadoRaw = typeof repartidorEstado === 'string' ? repartidorEstado.trim().toLowerCase() : '';
  const repartidorEstadoValue = ['libre', 'ocupado', 'inactivo'].includes(repartidorEstadoRaw)
    ? repartidorEstadoRaw
    : null;

  const [result] = await pool.execute(
    `INSERT INTO usuarios (nombre_usuario, nombre_completo, rol, password, dni, telefono, email, foto_url, permisos, moto_matricula, repartidor_estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombreUsuario,
      nombreCompleto,
      rol,
      hashPassword(password),
      dni || null,
      telefono || null,
      emailValue || null,
      fotoUrl || null,
      permisosValue,
      motoMatriculaValue || null,
      repartidorEstadoValue || (String(rol || '').toUpperCase() === 'REPARTIDOR' ? 'libre' : null)
    ]
  );

  const [rows] = await pool.query(
    `SELECT id, nombre_usuario, nombre_completo, rol, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active,
            moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at
     FROM usuarios WHERE id = ?`,
    [result.insertId]
  );
  res.status(201).json(mapUsuarioRow(rows[0]));
};

const updateUsuario = async (req, res) => {
  await ensureUsuariosOptionalColumns();
  const { id } = req.params;
  const { nombreUsuario, nombreCompleto, rol, password, dni, telefono, email, fotoUrl, isActive, permisos, motoMatricula, repartidorEstado } = req.body;
  const safePassword = password && password.trim() !== '' ? hashPassword(password) : null;
  const telefonoValue = telefono === undefined ? null : (telefono === '' ? null : telefono);
  const emailValue = email === undefined ? null : (String(email || '').trim().toLowerCase() || null);
  const fotoUrlValue = fotoUrl === undefined ? null : (fotoUrl === '' ? null : fotoUrl);
  const isActiveValue = typeof isActive === 'boolean' ? (isActive ? 1 : 0) : null;
  const hasPermisos = Object.prototype.hasOwnProperty.call(req.body, 'permisos');
  const hasMotoMatricula = Object.prototype.hasOwnProperty.call(req.body, 'motoMatricula');
  const hasRepartidorEstado = Object.prototype.hasOwnProperty.call(req.body, 'repartidorEstado');
  const dniValue = dni === undefined ? null : (dni === '' ? null : dni);

  const [currentRows] = await pool.query('SELECT id, rol, permisos FROM usuarios WHERE id = ?', [id]);
  if (currentRows.length === 0) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }

  const current = currentRows[0];
  const nextRol = rol || current.rol;
  const permisosValue = hasPermisos
    ? JSON.stringify(normalizePermisos(nextRol, permisos))
    : null;
  const motoMatriculaValue = hasMotoMatricula ? (String(motoMatricula || '').trim() || null) : null;
  const repartidorEstadoRaw = hasRepartidorEstado ? String(repartidorEstado || '').trim().toLowerCase() : '';
  const repartidorEstadoValue = hasRepartidorEstado
    ? (['libre', 'ocupado', 'inactivo'].includes(repartidorEstadoRaw) ? repartidorEstadoRaw : null)
    : null;

  if (dniValue && !/^\d{8}$/.test(String(dniValue))) {
    return res.status(400).json({ message: 'El DNI debe tener 8 dígitos.' });
  }

  if (telefonoValue && !isTelefonoValido(String(telefonoValue))) {
    return res.status(400).json({ message: 'El teléfono debe tener 9 dígitos.' });
  }
  if (emailValue && !isEmailValido(emailValue)) {
    return res.status(400).json({ message: 'El correo no es válido.' });
  }

  const [result] = await pool.execute(
    `UPDATE usuarios SET
      nombre_usuario = COALESCE(?, nombre_usuario),
      nombre_completo = COALESCE(?, nombre_completo),
      rol = COALESCE(?, rol),
      password = COALESCE(?, password),
      dni = COALESCE(?, dni),
      telefono = COALESCE(?, telefono),
      email = COALESCE(?, email),
      foto_url = COALESCE(?, foto_url),
      permisos = COALESCE(?, permisos),
      moto_matricula = COALESCE(?, moto_matricula),
      repartidor_estado = COALESCE(?, repartidor_estado),
      is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [
      nombreUsuario || null,
      nombreCompleto || null,
      rol || null,
      safePassword,
      dniValue,
      telefonoValue,
      emailValue,
      fotoUrlValue,
      permisosValue,
      motoMatriculaValue,
      repartidorEstadoValue,
      isActiveValue,
      id
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }

  const [rows] = await pool.query(
    `SELECT id, nombre_usuario, nombre_completo, rol, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active,
            moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at
     FROM usuarios WHERE id = ?`,
    [id]
  );
  res.json(mapUsuarioRow(rows[0]));
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }

  res.status(204).send();
};

const unlockUsuario = async (req, res) => {
  await ensureUsuariosOptionalColumns();
  const { id } = req.params;
  const [result] = await pool.execute(
    'UPDATE usuarios SET is_blocked = 0, failed_attempts = 0, lockouts = 0, lock_until = NULL WHERE id = ?',
    [id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }

  const [rows] = await pool.query(
    `SELECT id, nombre_usuario, nombre_completo, rol, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active,
            moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at
     FROM usuarios WHERE id = ?`,
    [id]
  );
  res.json(mapUsuarioRow(rows[0]));
};

module.exports = {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  unlockUsuario
};
