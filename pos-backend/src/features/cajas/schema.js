const pool = require('../../db/pool');

let cajasSchemaChecked = false;

const ensureColumn = async (runner, tableName, columnName, ddl) => {
  const [rows] = await runner.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  if (rows.length > 0) return;
  await runner.query(ddl);
};

const ensureCajasSchema = async (runner = pool) => {
  if (cajasSchemaChecked) return;

  await runner.query(`
    CREATE TABLE IF NOT EXISTS caja_sesiones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      usuario_nombre VARCHAR(120) NULL,
      monto_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_esperado DECIMAL(12,2) NULL,
      monto_final_declarado DECIMAL(12,2) NULL,
      diferencia DECIMAL(12,2) NULL,
      fondo_asignado_id INT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA',
      abierta_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cerrada_at TIMESTAMP NULL,
      INDEX idx_caja_usuario_estado (usuario_id, estado),
      INDEX idx_caja_abierta_at (abierta_at)
    )
  `);

  await ensureColumn(
    runner,
    'caja_sesiones',
    'fondo_asignado_id',
    'ALTER TABLE caja_sesiones ADD COLUMN fondo_asignado_id INT NULL AFTER diferencia'
  );

  await runner.query(`
    CREATE TABLE IF NOT EXISTS caja_fondos_asignados (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      usuario_nombre VARCHAR(120) NULL,
      asignado_por_id INT NOT NULL,
      asignado_por_nombre VARCHAR(120) NULL,
      monto DECIMAL(12,2) NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
      caja_sesion_id INT NULL,
      nota VARCHAR(255) NULL,
      creado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      usado_at TIMESTAMP NULL,
      INDEX idx_caja_fondos_usuario_estado (usuario_id, estado),
      INDEX idx_caja_fondos_estado (estado),
      INDEX idx_caja_fondos_creado_at (creado_at)
    )
  `);

  await runner.query(`
    CREATE TABLE IF NOT EXISTS caja_movimientos_efectivo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      caja_sesion_id INT NOT NULL,
      usuario_id INT NOT NULL,
      usuario_nombre VARCHAR(120) NULL,
      tipo VARCHAR(20) NOT NULL,
      monto DECIMAL(12,2) NOT NULL,
      motivo VARCHAR(255) NOT NULL,
      creado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_caja_movimientos_sesion (caja_sesion_id),
      INDEX idx_caja_movimientos_tipo (tipo),
      INDEX idx_caja_movimientos_creado_at (creado_at)
    )
  `);

  const [ventaColumns] = await runner.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ventas'
        AND COLUMN_NAME = 'caja_sesion_id'`
  );
  if (ventaColumns.length === 0) {
    await runner.query('ALTER TABLE ventas ADD COLUMN caja_sesion_id INT NULL');
    await runner.query('CREATE INDEX idx_ventas_caja_sesion ON ventas (caja_sesion_id)');
  }

  await runner.query(`
    CREATE TABLE IF NOT EXISTS venta_pagos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venta_id INT NOT NULL,
      metodo VARCHAR(40) NOT NULL,
      monto DECIMAL(12,2) NOT NULL,
      recibido DECIMAL(12,2) NULL,
      vuelto DECIMAL(12,2) NOT NULL DEFAULT 0,
      referencia VARCHAR(80) NULL,
      creado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_venta_pagos_venta (venta_id),
      INDEX idx_venta_pagos_metodo (metodo)
    )
  `);

  cajasSchemaChecked = true;
};

module.exports = { ensureCajasSchema };
