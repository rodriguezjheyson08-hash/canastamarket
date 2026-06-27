const pool = require('../../db/pool');

let cajasSchemaChecked = false;

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
      estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA',
      abierta_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cerrada_at TIMESTAMP NULL,
      INDEX idx_caja_usuario_estado (usuario_id, estado),
      INDEX idx_caja_abierta_at (abierta_at)
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
