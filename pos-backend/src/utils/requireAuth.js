/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/requireAuth.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// UTILIDAD BACKEND - AUTENTICACION:
// Middleware que valida token JWT y permisos antes de permitir usar rutas protegidas.
const { verifyToken } = require('./tokens');

const parseBearerToken = (req) => {
  const raw = String(req.headers?.authorization || '').trim();
  if (!raw.toLowerCase().startsWith('bearer ')) return '';
  return raw.slice(7).trim();
};

// LOGICA: require Auth concentra una operacion de este archivo.
const requireAuth = (options = {}) => (req, res, next) => {
  const token = parseBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No autenticado.' });
  }

  try {
    const payload = verifyToken(token);
    const allowedTypes = options.types
      ? options.types.map((value) => String(value || ''))
      : (options.type ? [String(options.type || '')] : []);
    if (allowedTypes.length > 0 && !allowedTypes.includes(String(payload.type || ''))) {
      return res.status(403).json({ message: 'Token no permitido para este recurso.' });
    }
    if (options.roles && Array.isArray(options.roles) && options.roles.length > 0) {
      const role = String(payload.role || '').toUpperCase();
      const validRoles = new Set(options.roles.map((value) => String(value || '').toUpperCase()));
      if (!validRoles.has(role)) {
        return res.status(403).json({ message: 'No autorizado.' });
      }
    }
    req.auth = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || 'Token inválido.' });
  }
};

module.exports = {
  requireAuth
};
