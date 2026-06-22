/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/ensurePasswordColumnSchema.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// UTILIDAD BACKEND - ESQUEMA PASSWORD:
// Verifica que las columnas de password/login existan y tengan tipo correcto.
const pool = require('../db/pool');

const checkedColumns = new Set();
const PASSWORD_LENGTH = 255;

// LOGICA: ensure Password Column Schema concentra una operacion de este archivo.
const ensurePasswordColumnSchema = async ({ tableName, nullable = false, runner = pool }) => {
  const cacheKey = `${tableName}:${nullable ? 'null' : 'not-null'}`;
  if (checkedColumns.has(cacheKey)) return;

  const [rows] = await runner.query(
    `SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = 'password'
      LIMIT 1`,
    [tableName]
  );

  if (rows.length === 0) return;

  const row = rows[0] || {};
  const dataType = String(row.DATA_TYPE || '').toLowerCase();
  const maxLength = Number(row.CHARACTER_MAXIMUM_LENGTH || 0);
  const isNullable = String(row.IS_NULLABLE || '').toUpperCase() === 'YES';

  if (dataType !== 'varchar' || maxLength < PASSWORD_LENGTH || isNullable !== nullable) {
    await runner.query(
      `ALTER TABLE ${tableName} MODIFY COLUMN password VARCHAR(${PASSWORD_LENGTH}) ${nullable ? 'NULL' : 'NOT NULL'}`
    );
  }

  checkedColumns.add(cacheKey);
};

module.exports = {
  ensurePasswordColumnSchema,
  PASSWORD_LENGTH
};
