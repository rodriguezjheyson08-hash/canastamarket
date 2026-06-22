CREATE DATABASE IF NOT EXISTS licoreria_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE licoreria_pos;

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  precio_venta DECIMAL(10, 2) NOT NULL,
  precio_compra DECIMAL(10, 2) NULL,
  codigo_barras VARCHAR(80) NULL,
  stock_actual INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  categoria_id INT NULL,
  imagen MEDIUMTEXT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  codigo_barras_activo VARCHAR(80)
    GENERATED ALWAYS AS (CASE WHEN activo = 1 THEN codigo_barras ELSE NULL END) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_productos_codigo_barras_activo (codigo_barras_activo),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  total DECIMAL(10, 2) NOT NULL,
  metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo',
  recibido DECIMAL(10, 2) NULL,
  vuelto DECIMAL(10, 2) NULL,
  cliente_id INT NULL,
  cliente_dni VARCHAR(8) NULL,
  cliente_nombre VARCHAR(160) NULL,
  pedido_estado VARCHAR(20) NULL,
  pedido_updated_at TIMESTAMP NULL,
  direccion_entrega VARCHAR(255) NULL,
  ubicacion_lat DECIMAL(10, 7) NULL,
  ubicacion_lng DECIMAL(10, 7) NULL,
  pedido_rechazo_motivo VARCHAR(255) NULL,
  vendedor_id INT NULL,
  vendedor_usuario VARCHAR(50) NULL,
  vendedor_nombre VARCHAR(120) NULL,
  repartidor_id INT NULL,
  repartidor_asignado_at TIMESTAMP NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venta_detalles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id)
    REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
  nombre_completo VARCHAR(120) NOT NULL,
  rol ENUM('ADMINISTRADOR', 'CAJERO', 'REPARTIDOR') NOT NULL,
  password VARCHAR(255) NOT NULL,
  dni VARCHAR(8) NULL,
  telefono VARCHAR(9) NULL,
  foto_url MEDIUMTEXT NULL,
  permisos LONGTEXT NULL,
  moto_matricula VARCHAR(40) NULL,
  repartidor_estado VARCHAR(20) NULL DEFAULT 'libre',
  last_lat DECIMAL(10, 7) NULL,
  last_lng DECIMAL(10, 7) NULL,
  last_seen_at TIMESTAMP NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  lockouts INT NOT NULL DEFAULT 0,
  lock_until DATETIME NULL,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave VARCHAR(60) NOT NULL PRIMARY KEY,
  valor LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repartidor_ubicaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  repartidor_id INT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ru_venta_created (venta_id, created_at),
  INDEX idx_ru_rep_created (repartidor_id, created_at)
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  nombre_completo VARCHAR(160) NULL,
  telefono VARCHAR(15) NULL,
  direccion VARCHAR(255) NULL,
  ubicacion_lat DECIMAL(10, 7) NULL,
  ubicacion_lng DECIMAL(10, 7) NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'email',
  google_sub VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clientes_google_sub (google_sub)
);

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

-- Producción: no sembrar usuarios con credenciales por defecto.
-- Crea el primer administrador manualmente con una contraseña temporal y cámbiala al desplegar.
