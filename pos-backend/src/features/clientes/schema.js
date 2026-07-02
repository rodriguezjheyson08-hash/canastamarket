const pool = require('../../db/pool');
const { ensurePasswordColumnSchema } = require('../../utils/ensurePasswordColumnSchema');

let checked = false;

const ensureClientesSchema = async (runner = pool) => {
  if (checked) return;
  await runner.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(180) NOT NULL UNIQUE,
      password VARCHAR(255) NULL,
      nombre_completo VARCHAR(160) NULL,
      dni VARCHAR(8) NULL,
      telefono VARCHAR(15) NULL,
      direccion VARCHAR(255) NULL,
      provider VARCHAR(20) NOT NULL DEFAULT 'email',
      google_sub VARCHAR(80) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await ensurePasswordColumnSchema({ tableName: 'clientes', runner, nullable: true });
  const [columns] = await runner.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes'
        AND COLUMN_NAME IN ('dni', 'telefono', 'direccion', 'is_active')`
  );
  const found = new Set(columns.map((row) => row.COLUMN_NAME));
  if (!found.has('dni')) await runner.query('ALTER TABLE clientes ADD COLUMN dni VARCHAR(8) NULL AFTER nombre_completo');
  if (!found.has('telefono')) await runner.query('ALTER TABLE clientes ADD COLUMN telefono VARCHAR(15) NULL');
  if (!found.has('direccion')) await runner.query('ALTER TABLE clientes ADD COLUMN direccion VARCHAR(255) NULL');
  if (!found.has('is_active')) await runner.query('ALTER TABLE clientes ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
  checked = true;
};

module.exports = { ensureClientesSchema };
