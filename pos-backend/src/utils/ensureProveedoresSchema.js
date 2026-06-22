/*
 * MAPA DEL ARCHIVO: UTILIDAD BACKEND
 * UBICACION: pos-backend/src/utils/ensureProveedoresSchema.js
 * QUE HACE: Asegura que existan las tablas/columnas actuales del modulo proveedores.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// UTILIDAD BACKEND - ESQUEMA PROVEEDORES:
// Verifica/crea columnas y tablas necesarias del modulo proveedores.
const pool = require('../db/pool');

let proveedoresSchemaChecked = false;

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

// LOGICA: ensure Proveedores Schema concentra una operacion de este archivo.
const ensureProveedoresSchema = async (runner = pool) => {
  if (proveedoresSchemaChecked) return;

  await runner.query(
    `CREATE TABLE IF NOT EXISTS proveedores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero_documento VARCHAR(11) NOT NULL UNIQUE,
      razon_social VARCHAR(180) NOT NULL,
      direccion VARCHAR(255) NULL,
      contacto_nombre VARCHAR(120) NULL,
      contacto_telefono VARCHAR(30) NULL,
      contacto_email VARCHAR(180) NULL,
      estado VARCHAR(30) NULL,
      condicion VARCHAR(30) NULL,
      distrito VARCHAR(80) NULL,
      provincia VARCHAR(80) NULL,
      departamento VARCHAR(80) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  const proveedorColumns = [
    ['direccion', 'ALTER TABLE proveedores ADD COLUMN direccion VARCHAR(255) NULL'],
    ['contacto_nombre', 'ALTER TABLE proveedores ADD COLUMN contacto_nombre VARCHAR(120) NULL'],
    ['contacto_telefono', 'ALTER TABLE proveedores ADD COLUMN contacto_telefono VARCHAR(30) NULL'],
    ['contacto_email', 'ALTER TABLE proveedores ADD COLUMN contacto_email VARCHAR(180) NULL'],
    ['estado', 'ALTER TABLE proveedores ADD COLUMN estado VARCHAR(30) NULL'],
    ['condicion', 'ALTER TABLE proveedores ADD COLUMN condicion VARCHAR(30) NULL'],
    ['distrito', 'ALTER TABLE proveedores ADD COLUMN distrito VARCHAR(80) NULL'],
    ['provincia', 'ALTER TABLE proveedores ADD COLUMN provincia VARCHAR(80) NULL'],
    ['departamento', 'ALTER TABLE proveedores ADD COLUMN departamento VARCHAR(80) NULL'],
    ['activo', 'ALTER TABLE proveedores ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1'],
    ['created_at', 'ALTER TABLE proveedores ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ['updated_at', 'ALTER TABLE proveedores ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
  ];

  for (const [columnName, ddl] of proveedorColumns) {
    await ensureColumn(runner, 'proveedores', columnName, ddl);
  }

  await runner.query(
    `CREATE TABLE IF NOT EXISTS pedidos_compra (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proveedor_id INT NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
      notas VARCHAR(255) NULL,
      solicitante_dni VARCHAR(8) NULL,
      solicitante_nombre VARCHAR(160) NULL,
      comprador_nombre VARCHAR(160) NULL,
      comprador_ruc VARCHAR(11) NULL,
      comprador_direccion VARCHAR(255) NULL,
      comprador_telefono VARCHAR(40) NULL,
      fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pc_proveedor_fecha (proveedor_id, fecha),
      CONSTRAINT fk_pedidos_compra_proveedor FOREIGN KEY (proveedor_id)
        REFERENCES proveedores(id)
    )`
  );

  const pedidoColumns = [
    ['solicitante_dni', 'ALTER TABLE pedidos_compra ADD COLUMN solicitante_dni VARCHAR(8) NULL'],
    ['solicitante_nombre', 'ALTER TABLE pedidos_compra ADD COLUMN solicitante_nombre VARCHAR(160) NULL'],
    ['comprador_nombre', 'ALTER TABLE pedidos_compra ADD COLUMN comprador_nombre VARCHAR(160) NULL'],
    ['comprador_ruc', 'ALTER TABLE pedidos_compra ADD COLUMN comprador_ruc VARCHAR(11) NULL'],
    ['comprador_direccion', 'ALTER TABLE pedidos_compra ADD COLUMN comprador_direccion VARCHAR(255) NULL'],
    ['comprador_telefono', 'ALTER TABLE pedidos_compra ADD COLUMN comprador_telefono VARCHAR(40) NULL']
  ];

  for (const [columnName, ddl] of pedidoColumns) {
    await ensureColumn(runner, 'pedidos_compra', columnName, ddl);
  }

  await runner.query(
    `CREATE TABLE IF NOT EXISTS pedidos_compra_detalles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pedido_compra_id INT NOT NULL,
      producto_id INT NOT NULL,
      cantidad INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pcd_pedido (pedido_compra_id),
      CONSTRAINT fk_pcd_pedido FOREIGN KEY (pedido_compra_id)
        REFERENCES pedidos_compra(id) ON DELETE CASCADE,
      CONSTRAINT fk_pcd_producto FOREIGN KEY (producto_id)
        REFERENCES productos(id)
    )`
  );

  proveedoresSchemaChecked = true;
};

module.exports = {
  ensureProveedoresSchema
};
