const pool = require('../db/pool');

let repartoSchemaChecked = false;

const ensureUsuariosRolHasRepartidor = async (runner) => {
  const [rows] = await runner.query(
    `SELECT COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME = 'rol'
      LIMIT 1`
  );

  if (rows.length === 0) return;
  const columnType = String(rows[0]?.COLUMN_TYPE || '');
  if (columnType.includes('REPARTIDOR')) return;

  await runner.query("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('ADMINISTRADOR','CAJERO','REPARTIDOR') NOT NULL");
};

const ensureColumn = async (runner, tableName, columnName, ddl) => {
  const [rows] = await runner.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [tableName, columnName]
  );
  if (rows.length > 0) return;
  await runner.query(ddl);
};

const ensureTable = async (runner, ddl) => {
  await runner.query(ddl);
};

const ensureRepartoSchema = async (runner = pool) => {
  if (repartoSchemaChecked) return;

  await ensureUsuariosRolHasRepartidor(runner);

  await ensureColumn(
    runner,
    'usuarios',
    'moto_matricula',
    'ALTER TABLE usuarios ADD COLUMN moto_matricula VARCHAR(40) NULL'
  );
  await ensureColumn(
    runner,
    'usuarios',
    'repartidor_estado',
    "ALTER TABLE usuarios ADD COLUMN repartidor_estado VARCHAR(20) NULL DEFAULT 'libre'"
  );
  await ensureColumn(
    runner,
    'usuarios',
    'last_lat',
    'ALTER TABLE usuarios ADD COLUMN last_lat DECIMAL(10, 7) NULL'
  );
  await ensureColumn(
    runner,
    'usuarios',
    'last_lng',
    'ALTER TABLE usuarios ADD COLUMN last_lng DECIMAL(10, 7) NULL'
  );
  await ensureColumn(
    runner,
    'usuarios',
    'last_seen_at',
    'ALTER TABLE usuarios ADD COLUMN last_seen_at TIMESTAMP NULL'
  );

  await ensureColumn(
    runner,
    'ventas',
    'repartidor_id',
    'ALTER TABLE ventas ADD COLUMN repartidor_id INT NULL'
  );
  await ensureColumn(
    runner,
    'ventas',
    'repartidor_asignado_at',
    'ALTER TABLE ventas ADD COLUMN repartidor_asignado_at TIMESTAMP NULL'
  );

  await ensureTable(
    runner,
    `CREATE TABLE IF NOT EXISTS repartidor_ubicaciones (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      venta_id INT NOT NULL,
      repartidor_id INT NOT NULL,
      lat DECIMAL(10, 7) NOT NULL,
      lng DECIMAL(10, 7) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ru_venta_created (venta_id, created_at),
      INDEX idx_ru_rep_created (repartidor_id, created_at)
    )`
  );

  repartoSchemaChecked = true;
};

module.exports = {
  ensureRepartoSchema
};

