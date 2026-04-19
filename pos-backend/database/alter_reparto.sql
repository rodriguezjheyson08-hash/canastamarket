-- Reparto / delivery: repartidores + tracking
-- Ejecuta este script si ya tienes la BD creada y deseas habilitar reparto.

-- 1) Permitir el rol REPARTIDOR
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('ADMINISTRADOR','CAJERO','REPARTIDOR') NOT NULL;

-- 2) Campos extra para repartidor (perfil + disponibilidad + última ubicación)
ALTER TABLE usuarios
  ADD COLUMN moto_matricula VARCHAR(40) NULL,
  ADD COLUMN repartidor_estado VARCHAR(20) NULL DEFAULT 'libre',
  ADD COLUMN last_lat DECIMAL(10, 7) NULL,
  ADD COLUMN last_lng DECIMAL(10, 7) NULL,
  ADD COLUMN last_seen_at TIMESTAMP NULL;

-- 3) Asignación de pedido a repartidor
ALTER TABLE ventas
  ADD COLUMN repartidor_id INT NULL,
  ADD COLUMN repartidor_asignado_at TIMESTAMP NULL;

-- 4) Historial de ubicaciones del repartidor por pedido
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

