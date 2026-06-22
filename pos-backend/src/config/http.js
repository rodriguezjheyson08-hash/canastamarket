/*
 * MAPA DEL ARCHIVO: CONFIGURACION BACKEND
 * UBICACION: pos-backend/src/config/http.js
 * QUE HACE: Lee y centraliza configuracion del servidor.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// CONFIGURACION BACKEND - HTTP:
// Define opciones compartidas para CORS, dominios permitidos o comportamiento de red.
const DEFAULT_AUTH_SECRET = 'change-this-auth-secret';

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const parseCorsOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// LOGICA: log Server Urls concentra una operacion de este archivo.
const logServerUrls = (port) => {
  console.log('API escuchando en:');
  console.log(`Local:  http://localhost:${port}`);
  console.log(`Red:    http://192.168.56.1:${port}`);
};

module.exports = {
  DEFAULT_AUTH_SECRET,
  isProduction,
  logServerUrls,
  parseCorsOrigins
};

