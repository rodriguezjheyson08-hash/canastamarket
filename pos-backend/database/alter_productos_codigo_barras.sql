USE licoreria_pos;

ALTER TABLE productos
  ADD COLUMN codigo_barras VARCHAR(80) NULL AFTER precio_compra;

ALTER TABLE productos
  ADD COLUMN codigo_barras_activo VARCHAR(80)
    GENERATED ALWAYS AS (CASE WHEN activo = 1 THEN codigo_barras ELSE NULL END) STORED AFTER activo;

ALTER TABLE productos
  ADD UNIQUE KEY uq_productos_codigo_barras_activo (codigo_barras_activo);
