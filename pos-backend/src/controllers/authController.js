const pool = require('../db/pool');
const { normalizePermisos } = require('../utils/permisos');
const { ensureRepartoSchema } = require('../utils/ensureRepartoSchema');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');

let usuariosPermisosColumnChecked = false;

const ensureUsuariosPermisosColumn = async (runner = pool) => {
  if (usuariosPermisosColumnChecked) return;

  await ensurePasswordColumnSchema({ tableName: 'usuarios', runner });

  const [rows] = await runner.query(
    `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME IN ('permisos', 'dni', 'email')`
  );

  const info = rows.reduce((acc, row) => {
    acc[String(row.COLUMN_NAME || '').toLowerCase()] = String(row.DATA_TYPE || '').toLowerCase();
    return acc;
  }, {});

  if (!info.permisos) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN permisos LONGTEXT NULL');
  } else {
    const validTypes = new Set(['json', 'text', 'mediumtext', 'longtext']);
    if (!validTypes.has(info.permisos)) {
      await runner.query('ALTER TABLE usuarios MODIFY COLUMN permisos LONGTEXT NULL');
    }
  }

  if (!info.dni) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN dni VARCHAR(8) NULL');
  } else if (info.dni !== 'varchar') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN dni VARCHAR(8) NULL');
  }

  if (!info.email) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN email VARCHAR(180) NULL');
  } else if (info.email !== 'varchar') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(180) NULL');
  }

  usuariosPermisosColumnChecked = true;
};

const login = async (req, res) => {
  await ensureUsuariosPermisosColumn();
  await ensureRepartoSchema();
  const { nombreUsuario, password } = req.body;
  if (!nombreUsuario || !password) {
    return res.status(400).json({ message: 'Nombre de usuario y password son obligatorios.' });
  }

  const [rows] = await pool.query(
    `SELECT id, nombre_usuario, nombre_completo, rol, password, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active
     FROM usuarios WHERE nombre_usuario = ?`,
    [nombreUsuario]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  const row = rows[0];

  const MAX_ATTEMPTS = 3;
  const isCajero = String(row.rol || '').trim().toUpperCase() === 'CAJERO';

  if (row.is_active === 0) {
    return res.status(403).json({ message: 'Cuenta desactivada. Contacta al administrador.' });
  }

  if (isCajero) {
    if (row.is_blocked) {
      return res.status(403).json({ message: 'Cuenta bloqueada. Contacta al administrador.' });
    }
    if (row.lock_until) {
      const lockUntil = new Date(row.lock_until);
      if (lockUntil > new Date()) {
        const retryAfterSeconds = Math.max(1, Math.ceil((lockUntil.getTime() - Date.now()) / 1000));
        return res.status(429).json({
          message: `Cuenta bloqueada temporalmente. Te quedan 0 intentos. Intenta en ${retryAfterSeconds} segundos.`,
          remaining_attempts: 0,
          retry_after_seconds: retryAfterSeconds
        });
      }
      await pool.execute(
        'UPDATE usuarios SET lock_until = NULL, failed_attempts = 0 WHERE id = ?',
        [row.id]
      );
    }
  }

  const passwordOk = verifyPassword(row.password, password);
  if (!passwordOk) {
    if (isCajero) {
      const nextAttempts = (row.failed_attempts || 0) + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        if ((row.lockouts || 0) >= 1) {
          await pool.execute(
            'UPDATE usuarios SET is_blocked = 1, failed_attempts = 0, lock_until = NULL WHERE id = ?',
            [row.id]
          );
          return res.status(403).json({
            message: 'Cuenta bloqueada. Te quedan 0 intentos. Contacta al administrador.',
            remaining_attempts: 0
          });
        }
        const lockUntil = new Date(Date.now() + 2 * 60 * 1000);
        await pool.execute(
          'UPDATE usuarios SET failed_attempts = 0, lock_until = ?, lockouts = lockouts + 1 WHERE id = ?',
          [lockUntil, row.id]
        );
        return res.status(429).json({
          message: 'Demasiados intentos. Te quedan 0 intentos. Cuenta bloqueada por 2 minutos.',
          remaining_attempts: 0
        });
      }
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - nextAttempts + 1);
      await pool.execute(
        'UPDATE usuarios SET failed_attempts = ? WHERE id = ?',
        [nextAttempts, row.id]
      );
      return res.status(401).json({
        message: `Credenciales inválidas. Te quedan ${remainingAttempts} intentos.`,
        remaining_attempts: remainingAttempts
      });
    }
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  if (isCajero) {
    await pool.execute(
      'UPDATE usuarios SET failed_attempts = 0, lockouts = 0, lock_until = NULL WHERE id = ?',
      [row.id]
    );
  }

  if (needsPasswordRehash(row.password)) {
    const hashedPassword = hashPassword(password);
    await pool.execute('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, row.id]);
  }

  const user = {
    id: row.id,
    nombreUsuario: row.nombre_usuario,
    nombreCompleto: row.nombre_completo,
    rol: row.rol,
    dni: row.dni,
    telefono: row.telefono,
    email: row.email,
    fotoUrl: row.foto_url,
    permisos: normalizePermisos(row.rol, row.permisos)
  };

  const token = createToken({
    sub: row.id,
    role: row.rol,
    type: String(row.rol || '').trim().toUpperCase() === 'REPARTIDOR' ? 'repartidor' : 'admin'
  });

  res.json({ token, user });
};

module.exports = {
  login
};
