const pool = require('../../db/pool');
let checked = false;

const ensurePasswordResetSchema = async (runner = pool) => {
  if (checked) return;
  await runner.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      account_type VARCHAR(20) NOT NULL,
      account_id INT NOT NULL,
      email VARCHAR(180) NOT NULL,
      code_hash CHAR(64) NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      requested_ip VARCHAR(64) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reset_lookup (account_type, email, used_at, expires_at),
      INDEX idx_reset_account (account_type, account_id)
    )
  `);
  checked = true;
};
module.exports = { ensurePasswordResetSchema };
