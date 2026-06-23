const securityHeaders = require('./securityHeaders');

describe('securityHeaders', () => {
  test('aplica cabeceras defensivas y elimina capacidades innecesarias', () => {
    const req = { secure: false };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      'geolocation=(self), microphone=(), camera=()'
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
