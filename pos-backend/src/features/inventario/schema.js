const pool = require('../../db/pool');
const { ensureAuditoriaSchema } = require('../auditoria/schema');

let inventarioSchemaChecked = false;

const ensureInventarioSchema = async (runner = pool) => {
  if (inventarioSchemaChecked) return;

  await ensureAuditoriaSchema(runner);
  await runner.query(`
    CREATE TABLE IF NOT EXISTS inventario_movimientos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      tipo VARCHAR(40) NOT NULL,
      cantidad INT NOT NULL,
      stock_anterior INT NOT NULL,
      stock_nuevo INT NOT NULL,
      referencia_tipo VARCHAR(60) NULL,
      referencia_id VARCHAR(80) NULL,
      motivo VARCHAR(255) NULL,
      usuario_id INT NULL,
      usuario_nombre VARCHAR(160) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_inventario_movimientos_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
      INDEX idx_inv_producto_fecha (producto_id, created_at),
      INDEX idx_inv_tipo_fecha (tipo, created_at),
      INDEX idx_inv_referencia (referencia_tipo, referencia_id)
    )
  `);

  inventarioSchemaChecked = true;
};

module.exports = { ensureInventarioSchema };
