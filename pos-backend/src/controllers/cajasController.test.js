jest.mock('../db/pool', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../features/cajas/schema', () => ({
  ensureCajasSchema: jest.fn()
}));

jest.mock('../features/pedidosOnline/schema', () => ({
  ensurePedidosOnlineSchema: jest.fn()
}));

jest.mock('../features/auditoria/service', () => ({
  registrarAuditoria: jest.fn()
}));

const pool = require('../db/pool');
const { abrirCaja, asignarFondoCaja, registrarMovimientoEfectivo } = require('./cajasController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('cajasController flujo de dinero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cajero no puede abrir caja si admin no le asigno fondo', async () => {
    const connection = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn()
        .mockResolvedValueOnce([[{ nombre_completo: 'Juan Cajero', nombre_usuario: 'juan_caj' }]])
        .mockResolvedValueOnce([[]]),
      execute: jest.fn()
    };
    pool.query.mockResolvedValueOnce([[]]);
    pool.getConnection.mockResolvedValueOnce(connection);

    const req = { auth: { sub: 7, role: 'CAJERO' }, body: {} };
    const res = mockRes();

    await abrirCaja(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toMatch(/fondo asignado/i);
    expect(pool.execute).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  test('admin no puede asignar fondo mayor al limite operativo', async () => {
    const req = { auth: { sub: 1, role: 'ADMINISTRADOR' }, body: { usuarioId: 7, monto: 50000 } };
    const res = mockRes();

    await asignarFondoCaja(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/no superar/i);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  test('registra salida de efectivo solo con caja abierta y motivo', async () => {
    const connection = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn().mockResolvedValueOnce([[{ nombre_completo: 'Juan Cajero', nombre_usuario: 'juan_caj' }]]),
      execute: jest.fn().mockResolvedValueOnce([{ insertId: 33 }])
    };
    pool.query
      .mockResolvedValueOnce([[{ id: 10, usuario_id: 7, estado: 'ABIERTA' }]])
      .mockResolvedValueOnce([[{
        id: 33,
        caja_sesion_id: 10,
        usuario_id: 7,
        usuario_nombre: 'Juan Cajero',
        tipo: 'SALIDA',
        monto: 25,
        motivo: 'Pago proveedor',
        creado_at: '2026-07-14 10:00:00'
      }]]);
    pool.getConnection.mockResolvedValueOnce(connection);

    const req = { auth: { sub: 7, role: 'CAJERO' }, body: { tipo: 'SALIDA', monto: 25, motivo: 'Pago proveedor' } };
    const res = mockRes();

    await registrarMovimientoEfectivo(req, res);

    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO caja_movimientos_efectivo'),
      [10, 7, 'Juan Cajero', 'SALIDA', 25, 'Pago proveedor']
    );
    expect(connection.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0]).toMatchObject({ tipo: 'SALIDA', monto: 25, motivo: 'Pago proveedor' });
  });
});
