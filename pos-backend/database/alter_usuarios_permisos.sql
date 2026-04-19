USE licoreria_pos;

ALTER TABLE usuarios
  ADD COLUMN permisos LONGTEXT NULL;
