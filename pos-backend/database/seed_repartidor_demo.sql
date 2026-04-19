-- Crea un usuario REPARTIDOR (demo)
-- Requisito: haber ejecutado `alter_reparto.sql` (o tener el schema actualizado).

INSERT INTO usuarios (
  nombre_usuario,
  nombre_completo,
  rol,
  password,
  telefono,
  moto_matricula,
  repartidor_estado
) VALUES (
  'repartidor',
  'Repartidor Demo',
  'REPARTIDOR',
  'repartidor123',
  '999888777',
  'ABC-123',
  'libre'
)
ON DUPLICATE KEY UPDATE
  nombre_completo = VALUES(nombre_completo),
  rol = VALUES(rol),
  password = VALUES(password),
  telefono = VALUES(telefono),
  moto_matricula = VALUES(moto_matricula),
  repartidor_estado = VALUES(repartidor_estado);

