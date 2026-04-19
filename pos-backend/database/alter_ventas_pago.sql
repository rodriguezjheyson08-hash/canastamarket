-- Agrega campos para registrar referencia del pago (ej. código Yape / id MP)
-- Ejecuta en tu base: licoreria_pos

ALTER TABLE ventas
  ADD COLUMN pago_referencia VARCHAR(80) NULL,
  ADD COLUMN pago_confirmado_at TIMESTAMP NULL;
