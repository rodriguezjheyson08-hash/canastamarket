/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/asyncHandler.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// UTILIDAD BACKEND - ERRORES ASYNC:
// Envuelve controllers async para pasar errores a Express sin repetir try/catch.
// UTILIDAD BACKEND - CAMBIOS: aqui se cambia el manejo comun de errores async.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
