USE licoreria_pos;

ALTER TABLE usuarios
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;
