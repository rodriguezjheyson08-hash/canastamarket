USE licoreria_pos;

UPDATE productos
   SET codigo_barras = NULL
 WHERE activo = 0
   AND codigo_barras IS NOT NULL;

ALTER TABLE productos
  DROP INDEX uq_productos_codigo_barras;

ALTER TABLE productos
  ADD COLUMN codigo_barras_activo VARCHAR(80)
    GENERATED ALWAYS AS (CASE WHEN activo = 1 THEN codigo_barras ELSE NULL END) STORED AFTER activo;

ALTER TABLE productos
  ADD UNIQUE KEY uq_productos_codigo_barras_activo (codigo_barras_activo);
