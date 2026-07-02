const pool = require('../db/pool');
const { ensureClientesSchema } = require('../features/clientes/schema');
const { ensurePasswordResetSchema } = require('../features/passwordReset/schema');
const { PASSWORD_MESSAGE, isStrongPassword, generateCode, hashCode, safeCodeEqual } = require('../features/passwordReset/security');
const { hashPassword } = require('../utils/passwords');
const { sendPasswordResetCode } = require('../services/emailService');

const genericMessage = 'Si el correo está registrado, recibirás un código de recuperación.';
const validTypes = new Set(['usuario', 'cliente']);

const findAccount = async (accountType, email) => {
  if (accountType === 'usuario') {
    const [rows] = await pool.query('SELECT id, email FROM usuarios WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1', [email]);
    return rows[0] || null;
  }
  await ensureClientesSchema();
  const [rows] = await pool.query('SELECT id, email FROM clientes WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1', [email]);
  return rows[0] || null;
};

const requestPasswordReset = async (req, res) => {
  await ensurePasswordResetSchema();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const accountType = String(req.body?.accountType || '').trim().toLowerCase();
  if (!validTypes.has(accountType) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Correo o tipo de cuenta inválido.' });
  }
  const account = await findAccount(accountType, email);
  if (!account) return res.json({ message: genericMessage });

  const [recent] = await pool.query(
    `SELECT id FROM password_reset_codes
      WHERE account_type = ? AND account_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
      LIMIT 1`,
    [accountType, account.id]
  );
  if (recent.length > 0) return res.status(429).json({ message: 'Espera un minuto antes de solicitar otro código.' });

  const code = generateCode();
  const codeHash = hashCode({ email, accountType, code });
  const [result] = await pool.execute(
    `INSERT INTO password_reset_codes
      (account_type, account_id, email, code_hash, expires_at, requested_ip)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), ?)`,
    [accountType, account.id, email, codeHash, String(req.ip || '').slice(0, 64) || null]
  );
  try {
    await sendPasswordResetCode({ to: email, code });
  } catch (error) {
    await pool.execute('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [result.insertId]);
    throw error;
  }
  return res.json({ message: genericMessage });
};

const confirmPasswordReset = async (req, res) => {
  await ensurePasswordResetSchema();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const accountType = String(req.body?.accountType || '').trim().toLowerCase();
  const code = String(req.body?.code || '').replace(/\D/g, '');
  const newPassword = String(req.body?.newPassword || '');
  if (!validTypes.has(accountType) || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Código inválido.' });
  if (!isStrongPassword(newPassword)) return res.status(400).json({ message: PASSWORD_MESSAGE });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM password_reset_codes
        WHERE account_type = ? AND email = ? AND used_at IS NULL AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [accountType, email]
    );
    const reset = rows[0];
    if (!reset || Number(reset.attempts) >= 5) throw new Error('El código venció o no es válido.');
    const actualHash = hashCode({ email, accountType, code });
    if (!safeCodeEqual(actualHash, reset.code_hash)) {
      await conn.execute('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?', [reset.id]);
      await conn.commit();
      return res.status(400).json({ message: 'El código venció o no es válido.' });
    }
    const table = accountType === 'usuario' ? 'usuarios' : 'clientes';
    await conn.execute(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashPassword(newPassword), reset.account_id]);
    await conn.execute('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [reset.id]);
    await conn.commit();
    return res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    await conn.rollback();
    return res.status(400).json({ message: error.message || 'No se pudo restablecer la contraseña.' });
  } finally {
    conn.release();
  }
};

module.exports = { requestPasswordReset, confirmPasswordReset };
