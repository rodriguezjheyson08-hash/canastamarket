/*
 * MAPA DEL ARCHIVO: MIDDLEWARE BACKEND
 * UBICACION: pos-backend/src/middleware/securityHeaders.js
 * QUE HACE: Funcion intermedia de Express para seguridad o validacion.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// MIDDLEWARE BACKEND - SEGURIDAD HTTP:
// Agrega headers de seguridad a cada respuesta antes de llegar al controller.
// MIDDLEWARE BACKEND - CAMBIOS: aqui se agregan o modifican headers de seguridad.
const { isProduction } = require('../config/http');

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');

  if (isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

module.exports = securityHeaders;

