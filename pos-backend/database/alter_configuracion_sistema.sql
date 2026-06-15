-- BASE DE DATOS: tabla para guardar Personalizacion y Boleta del sistema.
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave VARCHAR(60) NOT NULL PRIMARY KEY,
  valor LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
