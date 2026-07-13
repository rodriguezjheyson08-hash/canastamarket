jest.mock('../db/pool', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../features/clientes/schema', () => ({ ensureClientesSchema: jest.fn() }));
jest.mock('../features/passwordReset/schema', () => ({ ensurePasswordResetSchema: jest.fn() }));
jest.mock('../services/emailService', () => ({ sendPasswordResetCode: jest.fn() }));

const pool = require('../db/pool');
const { sendPasswordResetCode } = require('../services/emailService');
const { hashCode } = require('../features/passwordReset/security');
const { verifyPassword } = require('../utils/passwords');
const {
  requestPasswordReset,
  verifyPasswordResetCode,
  completePasswordReset
} = require('./passwordResetController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createConnection = () => ({
  beginTransaction: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
});

describe('passwordResetController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendPasswordResetCode.mockResolvedValue(undefined);
  });

  test('solicita codigo, normaliza correo y anula codigos anteriores', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 7, email: 'cajero@test.com' }]])
      .mockResolvedValueOnce([[]]);
    pool.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 44 }]);

    const res = createRes();
    await requestPasswordReset({
      body: { email: '  CAJERO@Test.com ', accountType: ' usuario ' },
      ip: '127.0.0.1'
    }, res);

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, email FROM usuarios WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1',
      ['cajero@test.com']
    );
    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE password_reset_codes'),
      ['usuario', 7]
    );
    expect(sendPasswordResetCode).toHaveBeenCalledWith(expect.objectContaining({ to: 'cajero@test.com' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('valida codigo correcto aunque venga con espacios o separadores', async () => {
    const conn = createConnection();
    pool.getConnection.mockResolvedValue(conn);
    pool.query.mockResolvedValueOnce([[{ id: 7, email: 'cajero@test.com' }]]);
    conn.query.mockResolvedValueOnce([[
      {
        id: 44,
        account_type: 'usuario',
        account_id: 7,
        email: 'cajero@test.com',
        attempts: 0,
        code_hash: hashCode({ email: 'cajero@test.com', accountType: 'usuario', code: '123456' })
      }
    ]]);

    const res = createRes();
    await verifyPasswordResetCode({
      body: { email: ' CAJERO@test.com ', accountType: 'usuario', code: '123-456' }
    }, res);

    expect(conn.query).toHaveBeenCalledWith(
      expect.stringContaining('account_id = ?'),
      ['usuario', 7, 'cajero@test.com']
    );
    expect(conn.execute).toHaveBeenCalledWith(
      'UPDATE password_reset_codes SET verified_at = NOW() WHERE id = ?',
      [44]
    );
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      resetToken: expect.any(String)
    }));
  });

  test('rechaza codigo incorrecto y aumenta intentos', async () => {
    const conn = createConnection();
    pool.getConnection.mockResolvedValue(conn);
    pool.query.mockResolvedValueOnce([[{ id: 7, email: 'cajero@test.com' }]]);
    conn.query.mockResolvedValueOnce([[
      {
        id: 44,
        account_type: 'usuario',
        account_id: 7,
        email: 'cajero@test.com',
        attempts: 0,
        code_hash: hashCode({ email: 'cajero@test.com', accountType: 'usuario', code: '123456' })
      }
    ]]);

    const res = createRes();
    await verifyPasswordResetCode({
      body: { email: 'cajero@test.com', accountType: 'usuario', code: '999999' }
    }, res);

    expect(conn.execute).toHaveBeenCalledWith(
      'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?',
      [44]
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('actualiza contrasena recuperada y queda valida para login', async () => {
    const conn = createConnection();
    pool.getConnection.mockResolvedValue(conn);
    conn.query.mockResolvedValueOnce([[
      {
        id: 44,
        account_type: 'usuario',
        account_id: 7,
        email: 'cajero@test.com'
      }
    ]]);
    pool.query.mockResolvedValueOnce([[{ id: 7, email: 'cajero@test.com' }]]);

    const res = createRes();
    await completePasswordReset({
      auth: { sub: 44, role: 'usuario' },
      body: { newPassword: ' NuevaClave123 ' }
    }, res);

    const updateCall = conn.execute.mock.calls.find((call) => call[0].includes('UPDATE usuarios SET password'));
    expect(updateCall).toBeTruthy();
    expect(verifyPassword(updateCall[1][0], 'NuevaClave123')).toBe(true);
    expect(conn.execute).toHaveBeenCalledWith(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?',
      [44]
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Contrasena actualizada correctamente.' });
  });

  test('rechaza contrasena debil al completar recuperacion', async () => {
    const res = createRes();
    await completePasswordReset({
      auth: { sub: 44, role: 'cliente' },
      body: { newPassword: 'debil' }
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});
