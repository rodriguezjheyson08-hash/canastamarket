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

const ensureTable = async (runner, ddl) => {
  await runner.query(ddl);
};

const ensureProveedoresSchema = async (runner = pool) => {
  if (proveedoresSchemaChecked) return;

  await ensureTable(
    runner,
    `CREATE TABLE IF NOT EXISTS proveedores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero_documento VARCHAR(11) NOT NULL UNIQUE,
      razon_social VARCHAR(180) NOT NULL,
      estado VARCHAR(30) NULL,
      condicion VARCHAR(30) NULL,
      direccion VARCHAR(255) NULL,
      ubigeo VARCHAR(10) NULL,
      via_tipo VARCHAR(20) NULL,
      via_nombre VARCHAR(120) NULL,
      zona_codigo VARCHAR(20) NULL,
      zona_tipo VARCHAR(80) NULL,
      numero VARCHAR(20) NULL,
      interior VARCHAR(20) NULL,
      lote VARCHAR(20) NULL,
      dpto VARCHAR(20) NULL,
      manzana VARCHAR(20) NULL,
      kilometro VARCHAR(20) NULL,
      distrito VARCHAR(80) NULL,
      provincia VARCHAR(80) NULL,
      departamento VARCHAR(80) NULL,
      tipo VARCHAR(120) NULL,
      actividad_economica VARCHAR(255) NULL,
      numero_trabajadores INT NULL,
      tipo_facturacion VARCHAR(80) NULL,
      tipo_contabilidad VARCHAR(80) NULL,
      comercio_exterior VARCHAR(80) NULL,
      es_agente_retencion TINYINT(1) NULL,
      es_buen_contribuyente TINYINT(1) NULL,
      locales_anexos LONGTEXT NULL,
      contacto_nombre VARCHAR(120) NULL,
      contacto_telefono VARCHAR(30) NULL,
      contacto_email VARCHAR(180) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  // Migración para instalaciones previas (agregar columnas faltantes).
  await ensureColumn(runner, 'proveedores', 'via_tipo', 'ALTER TABLE proveedores ADD COLUMN via_tipo VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'via_nombre', 'ALTER TABLE proveedores ADD COLUMN via_nombre VARCHAR(120) NULL');
  await ensureColumn(runner, 'proveedores', 'zona_codigo', 'ALTER TABLE proveedores ADD COLUMN zona_codigo VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'zona_tipo', 'ALTER TABLE proveedores ADD COLUMN zona_tipo VARCHAR(80) NULL');
  await ensureColumn(runner, 'proveedores', 'numero', 'ALTER TABLE proveedores ADD COLUMN numero VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'interior', 'ALTER TABLE proveedores ADD COLUMN interior VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'lote', 'ALTER TABLE proveedores ADD COLUMN lote VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'dpto', 'ALTER TABLE proveedores ADD COLUMN dpto VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'manzana', 'ALTER TABLE proveedores ADD COLUMN manzana VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'kilometro', 'ALTER TABLE proveedores ADD COLUMN kilometro VARCHAR(20) NULL');
  await ensureColumn(runner, 'proveedores', 'tipo', 'ALTER TABLE proveedores ADD COLUMN tipo VARCHAR(120) NULL');
  await ensureColumn(
    runner,
    'proveedores',
    'actividad_economica',
    'ALTER TABLE proveedores ADD COLUMN actividad_economica VARCHAR(255) NULL'
  );
  await ensureColumn(runner, 'proveedores', 'numero_trabajadores', 'ALTER TABLE proveedores ADD COLUMN numero_trabajadores INT NULL');
  await ensureColumn(runner, 'proveedores', 'tipo_facturacion', 'ALTER TABLE proveedores ADD COLUMN tipo_facturacion VARCHAR(80) NULL');
  await ensureColumn(runner, 'proveedores', 'tipo_contabilidad', 'ALTER TABLE proveedores ADD COLUMN tipo_contabilidad VARCHAR(80) NULL');
  await ensureColumn(runner, 'proveedores', 'comercio_exterior', 'ALTER TABLE proveedores ADD COLUMN comercio_exterior VARCHAR(80) NULL');
  await ensureColumn(
    runner,
    'proveedores',
    'es_agente_retencion',
    'ALTER TABLE proveedores ADD COLUMN es_agente_retencion TINYINT(1) NULL'
  );
  await ensureColumn(
    runner,
    'proveedores',
    'es_buen_contribuyente',
    'ALTER TABLE proveedores ADD COLUMN es_buen_contribuyente TINYINT(1) NULL'
  );
  await ensureColumn(runner, 'proveedores', 'locales_anexos', 'ALTER TABLE proveedores ADD COLUMN locales_anexos LONGTEXT NULL');

  await ensureTable(
    runner,
    `CREATE TABLE IF NOT EXISTS pedidos_compra (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proveedor_id INT NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
      notas VARCHAR(255) NULL,
      fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pc_proveedor_fecha (proveedor_id, fecha),
      CONSTRAINT fk_pedidos_compra_proveedor FOREIGN KEY (proveedor_id)
        REFERENCES proveedores(id)
    )`
  );

  await ensureTable(
    runner,
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
