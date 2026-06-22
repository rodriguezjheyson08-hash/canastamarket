/*
 * MAPA DEL ARCHIVO: BASE DE DATOS BACKEND
 * UBICACION: pos-backend/src/db/pool.js
 * QUE HACE: Configura conexion a MySQL.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// BASE DE DATOS BACKEND - POOL MYSQL:
// Crea y exporta la conexion reutilizable para consultas SQL en controllers y utilidades.
// BASE DE DATOS BACKEND - CAMBIOS: aqui se cambia host, puerto, usuario, password o nombre de base MySQL.
const mysql = require('mysql2/promise');
const env = require('../config/env');
const fs = require('fs');

const sslConfig = env.db.ssl ? {
  minVersion: 'TLSv1.2',
  ...(env.db.caPath ? { ca: fs.readFileSync(env.db.caPath) } : {})
} : undefined;

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
