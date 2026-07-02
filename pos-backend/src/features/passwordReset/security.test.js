const { isStrongPassword, generateCode, hashCode, safeCodeEqual } = require('./security');

describe('seguridad de recuperación de contraseña', () => {
  test('exige contraseña robusta', () => {
    expect(isStrongPassword('Clave2026')).toBe(true);
    expect(isStrongPassword('corta1A')).toBe(false);
    expect(isStrongPassword('sinmayuscula1')).toBe(false);
    expect(isStrongPassword('SINMINUSCULA1')).toBe(false);
    expect(isStrongPassword('SinNumero')).toBe(false);
  });

  test('genera códigos de seis dígitos', () => {
    expect(generateCode()).toMatch(/^\d{6}$/);
  });

  test('el hash depende de correo, tipo y código', () => {
    const one = hashCode({ email: 'cliente@test.com', accountType: 'cliente', code: '123456' });
    const same = hashCode({ email: 'cliente@test.com', accountType: 'cliente', code: '123456' });
    const other = hashCode({ email: 'cliente@test.com', accountType: 'cliente', code: '654321' });
    expect(safeCodeEqual(one, same)).toBe(true);
    expect(safeCodeEqual(one, other)).toBe(false);
    expect(one).toHaveLength(64);
  });
});
