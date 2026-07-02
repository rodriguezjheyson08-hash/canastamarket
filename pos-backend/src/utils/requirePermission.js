const pool = require('../db/pool');
const { normalizePermisos } = require('./permisos');

const requirePermission = (permission) => async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT rol, permisos, is_active, is_blocked FROM usuarios WHERE id = ? LIMIT 1', [req.auth?.sub]);
    const user = rows[0];
    if (!user || !user.is_active || user.is_blocked) return res.status(403).json({ message: 'Cuenta no autorizada.' });
    const permisos = normalizePermisos(user.rol, user.permisos);
    if (!permisos[permission]) return res.status(403).json({ message: 'No tienes permiso para este módulo.' });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requirePermission };
