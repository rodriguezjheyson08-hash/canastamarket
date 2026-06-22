USE licoreria_pos;

-- ESQUEMA PROVEEDORES:
-- Tabla limpia con solo los campos que aparecen en el formulario/lista de proveedores.
CREATE TABLE IF NOT EXISTS proveedores (
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
);

-- LIMPIEZA PROVEEDORES:
-- Si la tabla ya tenia campos antiguos de SUNAT que ya no usa el formulario, se eliminan.
-- DROP COLUMN IF EXISTS requiere MySQL 8.0.29+.
ALTER TABLE proveedores
  DROP COLUMN IF EXISTS ubigeo,
  DROP COLUMN IF EXISTS via_tipo,
  DROP COLUMN IF EXISTS via_nombre,
  DROP COLUMN IF EXISTS zona_codigo,
  DROP COLUMN IF EXISTS zona_tipo,
  DROP COLUMN IF EXISTS numero,
  DROP COLUMN IF EXISTS interior,
  DROP COLUMN IF EXISTS lote,
  DROP COLUMN IF EXISTS dpto,
  DROP COLUMN IF EXISTS manzana,
  DROP COLUMN IF EXISTS kilometro,
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS actividad_economica,
  DROP COLUMN IF EXISTS numero_trabajadores,
  DROP COLUMN IF EXISTS tipo_facturacion,
  DROP COLUMN IF EXISTS tipo_contabilidad,
  DROP COLUMN IF EXISTS comercio_exterior,
  DROP COLUMN IF EXISTS es_agente_retencion,
  DROP COLUMN IF EXISTS es_buen_contribuyente,
  DROP COLUMN IF EXISTS locales_anexos;

-- COMPATIBILIDAD PROVEEDORES:
-- Agrega los campos actuales si la tabla ya existia y le falta alguno.
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS contacto_nombre VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS contacto_telefono VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS contacto_email VARCHAR(180) NULL,
  ADD COLUMN IF NOT EXISTS estado VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS condicion VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS distrito VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS departamento VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- PEDIDOS DE COMPRA:
-- Se mantienen porque la pantalla proveedores tiene la pestana "Pedidos de compra".
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
  notas VARCHAR(255) NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pc_proveedor_fecha (proveedor_id, fecha),
  CONSTRAINT fk_pedidos_compra_proveedor FOREIGN KEY (proveedor_id)
    REFERENCES proveedores(id)
);

CREATE TABLE IF NOT EXISTS pedidos_compra_detalles (
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
);
