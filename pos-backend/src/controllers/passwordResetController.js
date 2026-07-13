const pool = require('../db/pool');
const { ensureClientesSchema } = require('../features/clientes/schema');
const { ensurePasswordResetSchema } = require('../features/passwordReset/schema');
const { PASSWORD_MESSAGE, isStrongPassword, generateCode, hashCode, safeCodeEqual } = require('../features/passwordReset/security');
const { hashPassword } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');
const { sendPasswordResetCode } = require('../services/emailService');

const genericMessage = 'Si el correo esta registrado, recibiras un codigo de recuperacion.';
const validTypes = new Set(['usuario', 'cliente']);

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeAccountType = (value) => String(value || '').trim().toLowerCase();
const normalizeCode = (value) => String(value || '').normalize('NFKC').replace(/\D/g, '').slice(0, 6);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));

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
  const email = normalizeEmail(req.body?.email);
  const accountType = normalizeAccountType(req.body?.accountType);
  if (!validTypes.has(accountType) || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Correo o tipo de cuenta invalido.' });
  }

  const account = await findAccount(accountType, email);
  if (!account) return res.json({ message: genericMessage });

  const [recent] = await pool.query(
    `SELECT id FROM password_reset_codes
      WHERE account_type = ? AND account_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
      LIMIT 1`,
    [accountType, account.id]
  );
  if (recent.length > 0) return res.status(429).json({ message: 'Espera un minuto antes de solicitar otro codigo.' });

  const code = generateCode();
  const codeHash = hashCode({ email, accountType, code });
  await pool.execute(
    `UPDATE password_reset_codes
        SET used_at = NOW()
      WHERE account_type = ? AND account_id = ? AND used_at IS NULL`,
    [accountType, account.id]
  );
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

const verifyPasswordResetCode = async (req, res) => {
  await ensurePasswordResetSchema();
  const email = normalizeEmail(req.body?.email);
  const accountType = normalizeAccountType(req.body?.accountType);
  const code = normalizeCode(req.body?.code);
  if (!validTypes.has(accountType) || !isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Codigo invalido.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const account = await findAccount(accountType, email);
    if (!account) throw new Error('El codigo vencio o no es valido.');

    const [rows] = await conn.query(
      `SELECT * FROM password_reset_codes
        WHERE account_type = ? AND account_id = ? AND email = ? AND used_at IS NULL AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [accountType, account.id, email]
    );
    const reset = rows[0];
    if (!reset || Number(reset.attempts) >= 5) throw new Error('El codigo vencio o no es valido.');

    const actualHash = hashCode({ email, accountType, code });
    if (!safeCodeEqual(actualHash, reset.code_hash)) {
      await conn.execute('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?', [reset.id]);
      await conn.commit();
      return res.status(400).json({ message: 'El codigo vencio o no es valido.' });
    }

    await conn.execute('UPDATE password_reset_codes SET verified_at = NOW() WHERE id = ?', [reset.id]);
    await conn.commit();
    return res.json({
      message: 'Codigo validado. Ahora crea tu nueva contrasena.',
      resetToken: createToken({ sub: reset.id, role: accountType, type: 'password_reset', expiresInSeconds: 10 * 60 })
    });
  } catch (error) {
    await conn.rollback();
    return res.status(400).json({ message: error.message || 'No se pudo validar el codigo.' });
  } finally {
    conn.release();
  }
};

const completePasswordReset = async (req, res) => {
  await ensurePasswordResetSchema();
  const newPassword = String(req.body?.newPassword || '').trim();
  if (!isStrongPassword(newPassword)) return res.status(400).json({ message: PASSWORD_MESSAGE });

  const resetId = Number(req.auth?.sub);
  const accountType = normalizeAccountType(req.auth?.role);
  if (!Number.isInteger(resetId) || !validTypes.has(accountType)) {
    return res.status(400).json({ message: 'Autorizacion de recuperacion invalida.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM password_reset_codes
        WHERE id = ? AND account_type = ? AND verified_at IS NOT NULL
          AND used_at IS NULL AND expires_at > NOW()
        LIMIT 1 FOR UPDATE`,
      [resetId, accountType]
    );
    const reset = rows[0];
    if (!reset) throw new Error('La autorizacion vencio. Solicita un codigo nuevo.');

    const account = await findAccount(accountType, normalizeEmail(reset.email));
    if (!account || Number(account.id) !== Number(reset.account_id)) {
      throw new Error('La cuenta ya no esta activa. Solicita ayuda del administrador.');
    }

    const table = accountType === 'usuario' ? 'usuarios' : 'clientes';
    await conn.execute(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashPassword(newPassword), reset.account_id]);
    await conn.execute('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [reset.id]);
    await conn.commit();
    return res.json({ message: 'Contrasena actualizada correctamente.' });
  } catch (error) {
    await conn.rollback();
    return res.status(400).json({ message: error.message || 'No se pudo restablecer la contrasena.' });
  } finally {
    conn.release();
  }
};

module.exports = { requestPasswordReset, verifyPasswordResetCode, completePasswordReset };
