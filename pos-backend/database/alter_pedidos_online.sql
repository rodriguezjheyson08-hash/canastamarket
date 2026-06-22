-- BASE DE DATOS - PEDIDOS ONLINE
-- Ejecutar si deseas crear manualmente las tablas usadas por la tienda publica.
-- El backend tambien las crea automaticamente al iniciar el flujo de pedidos.

CREATE TABLE IF NOT EXISTS pedidos_online (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_RECOJO',
  metodo_pago VARCHAR(40) NOT NULL DEFAULT 'RECOJO',
  entrega VARCHAR(40) NOT NULL DEFAULT 'RECOJO_TIENDA',
  cliente_nombre VARCHAR(160) NOT NULL,
  cliente_email VARCHAR(160) NOT NULL,
  cliente_telefono VARCHAR(40) NULL,
  cliente_direccion VARCHAR(255) NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  boleta_html LONGTEXT NULL,
  pago_referencia VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos_online_detalles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  producto_nombre VARCHAR(180) NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_online_detalles_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos_online(id)
    ON DELETE CASCADE,
  INDEX idx_pedidos_online_detalles_pedido (pedido_id),
  INDEX idx_pedidos_online_detalles_producto (producto_id)
);
