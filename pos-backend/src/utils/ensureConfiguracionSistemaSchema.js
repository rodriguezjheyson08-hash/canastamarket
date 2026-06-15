/*
 * MAPA DEL ARCHIVO: UTILIDAD BACKEND
 * UBICACION: pos-backend/src/utils/ensureConfiguracionSistemaSchema.js
 * QUE HACE: Asegura la tabla de configuracion del sistema.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// BASE DE DATOS BACKEND - CONFIGURACION:
// Crea la tabla donde se guardan Personalizacion y Boleta como JSON serializado.
const pool = require('../db/pool');

let configuracionSistemaSchemaChecked = false;

// LOGICA: ensure Configuracion Sistema Schema concentra la creacion de la tabla requerida.
const ensureConfiguracionSistemaSchema = async (runner = pool) => {
  if (configuracionSistemaSchemaChecked) return;

  await runner.query(
    `CREATE TABLE IF NOT EXISTS configuracion_sistema (
      clave VARCHAR(60) NOT NULL PRIMARY KEY,
      valor LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  configuracionSistemaSchemaChecked = true;
};

module.exports = {
  ensureConfiguracionSistemaSchema
};
