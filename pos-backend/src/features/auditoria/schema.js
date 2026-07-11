const pool = require('../../db/pool');

let auditoriaSchemaChecked = false;

const ensureAuditoriaSchema = async (runner = pool) => {
  if (auditoriaSchemaChecked) return;

  await runner.query(`
    CREATE TABLE IF NOT EXISTS auditoria_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NULL,
      usuario_nombre VARCHAR(160) NULL,
      accion VARCHAR(80) NOT NULL,
      entidad VARCHAR(80) NOT NULL,
      entidad_id VARCHAR(80) NULL,
      detalle JSON NULL,
      ip VARCHAR(80) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auditoria_entidad (entidad, entidad_id),
      INDEX idx_auditoria_usuario (usuario_id),
      INDEX idx_auditoria_fecha (created_at)
    )
  `);

  auditoriaSchemaChecked = true;
};

module.exports = { ensureAuditoriaSchema };
