/*
 * MAPA DEL ARCHIVO: ESQUEMA BACKEND
 * UBICACION: pos-backend/src/features/ventas/schema.js
 * QUE HACE: Define estructura o reglas de datos del modulo.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// ESQUEMA BACKEND - VENTAS:
// Define columnas, tablas o reglas necesarias para guardar ventas correctamente.
// LOGICA BACKEND - CAMBIOS: aqui se ajustan reglas de columnas/tablas de ventas.
const pool = require('../../db/pool');

let ventasColumnsChecked = false;

const ensureVentaOptionalColumns = async (runner = pool) => {
  if (ventasColumnsChecked) return;

  const [rows] = await runner.query(
    `SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ventas'
        AND COLUMN_NAME IN (
          'metodo_pago', 'cliente_dni', 'cliente_nombre',
          'tipo_comprobante', 'cliente_tipo_documento', 'cliente_numero_documento',
          'cliente_ruc', 'cliente_direccion',
          'vendedor_id', 'vendedor_usuario', 'vendedor_nombre',
          'pago_referencia', 'pago_confirmado_at', 'caja_sesion_id'
        )`
  );

  const columnMap = new Map(rows.map((row) => [row.COLUMN_NAME, row]));
  const columnSet = new Set(rows.map((row) => row.COLUMN_NAME));

  const metodoPagoLength = Number(columnMap.get('metodo_pago')?.CHARACTER_MAXIMUM_LENGTH || 0);
  if (!columnSet.has('metodo_pago')) {
    await runner.query("ALTER TABLE ventas ADD COLUMN metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo'");
  } else if (metodoPagoLength > 0 && metodoPagoLength < 40) {
    await runner.query("ALTER TABLE ventas MODIFY COLUMN metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo'");
  }

  if (!columnSet.has('cliente_dni')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_dni VARCHAR(8) NULL');
  }

  if (!columnSet.has('cliente_nombre')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_nombre VARCHAR(160) NULL');
  }

  if (!columnSet.has('tipo_comprobante')) {
    await runner.query("ALTER TABLE ventas ADD COLUMN tipo_comprobante VARCHAR(20) NULL");
  }

  if (!columnSet.has('cliente_tipo_documento')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_tipo_documento VARCHAR(2) NULL');
  }

  if (!columnSet.has('cliente_numero_documento')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_numero_documento VARCHAR(11) NULL');
  }

  if (!columnSet.has('cliente_ruc')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_ruc VARCHAR(11) NULL');
  }

  if (!columnSet.has('cliente_direccion')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_direccion VARCHAR(220) NULL');
  }

  if (!columnSet.has('vendedor_id')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN vendedor_id INT NULL');
  }

  if (!columnSet.has('vendedor_usuario')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN vendedor_usuario VARCHAR(50) NULL');
  }

  if (!columnSet.has('vendedor_nombre')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN vendedor_nombre VARCHAR(120) NULL');
  }

  if (!columnSet.has('pago_referencia')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN pago_referencia VARCHAR(80) NULL');
  }

  if (!columnSet.has('pago_confirmado_at')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN pago_confirmado_at TIMESTAMP NULL');
  }

  if (!columnSet.has('caja_sesion_id')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN caja_sesion_id INT NULL');
  }

  ventasColumnsChecked = true;
};

module.exports = { ensureVentaOptionalColumns };
