const { createToken, verifyToken } = require('./tokens');

describe('tokens', () => {
  test('acepta un token firmado y vigente', () => {
    const token = createToken({ sub: 7, role: 'ADMINISTRADOR', type: 'admin' });
    const payload = verifyToken(token);

    expect(payload).toMatchObject({ sub: 7, role: 'ADMINISTRADOR', type: 'admin' });
  });

  test('rechaza una firma manipulada', () => {
    const token = createToken({ sub: 7, role: 'ADMINISTRADOR', type: 'admin' });
    const parts = token.split('.');
    parts[2] = `${parts[2].slice(0, -1)}${parts[2].endsWith('a') ? 'b' : 'a'}`;

    expect(() => verifyToken(parts.join('.'))).toThrow('Firma');
  });

  test('rechaza tokens expirados', () => {
    const token = createToken({ sub: 7, role: 'ADMINISTRADOR', type: 'admin', expiresInSeconds: -1 });

    expect(() => verifyToken(token)).toThrow('expirado');
  });
});
