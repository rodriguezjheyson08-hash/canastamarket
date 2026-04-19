const pool = require('../db/pool');

let tiendaConfigChecked = false;

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

const ensureTiendaConfigSchema = async (runner = pool) => {
  if (tiendaConfigChecked) return;

  await runner.query(`
    CREATE TABLE IF NOT EXISTS tienda_config (
      id INT PRIMARY KEY,
      app_name VARCHAR(180) NULL,
      logo_url LONGTEXT NULL,
      direccion VARCHAR(255) NULL,
      lat DECIMAL(10, 7) NULL,
      lng DECIMAL(10, 7) NULL,
      contact_email VARCHAR(180) NULL,
      contact_whatsapp VARCHAR(40) NULL,
      delivery_enabled TINYINT(1) NOT NULL DEFAULT 1,
      delivery_base DECIMAL(10, 2) NOT NULL DEFAULT 3.00,
      delivery_per_km DECIMAL(10, 2) NOT NULL DEFAULT 1.20,
      delivery_included_km DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
      delivery_min_fee DECIMAL(10, 2) NOT NULL DEFAULT 4.00,
      delivery_small_order_threshold DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
      delivery_small_order_fee DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
      delivery_max_km DECIMAL(10, 2) NOT NULL DEFAULT 8.00,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Si la tabla ya existía, asegura nuevas columnas.
  await ensureColumn(
    runner,
    'tienda_config',
    'app_name',
    'ALTER TABLE tienda_config ADD COLUMN app_name VARCHAR(180) NULL'
  );
  await ensureColumn(
    runner,
    'tienda_config',
    'logo_url',
    'ALTER TABLE tienda_config ADD COLUMN logo_url LONGTEXT NULL'
  );
  await ensureColumn(
    runner,
    'tienda_config',
    'contact_email',
    'ALTER TABLE tienda_config ADD COLUMN contact_email VARCHAR(180) NULL'
  );
  await ensureColumn(
    runner,
    'tienda_config',
    'contact_whatsapp',
    'ALTER TABLE tienda_config ADD COLUMN contact_whatsapp VARCHAR(40) NULL'
  );

  await runner.query('INSERT IGNORE INTO tienda_config (id) VALUES (1)');

  tiendaConfigChecked = true;
};

module.exports = {
  ensureTiendaConfigSchema
};
