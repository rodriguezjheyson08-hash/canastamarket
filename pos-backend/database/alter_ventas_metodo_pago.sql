USE licoreria_pos;

ALTER TABLE ventas
  MODIFY COLUMN metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo';
