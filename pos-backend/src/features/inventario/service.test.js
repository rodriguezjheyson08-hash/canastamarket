jest.mock('./schema', () => ({ ensureInventarioSchema: jest.fn() }));
jest.mock('../auditoria/service', () => ({
  getActor: jest.fn(() => ({ usuarioId: 7, usuarioNombre: 'Admin Test' })),
  registrarAuditoria: jest.fn()
}));

const { registrarMovimientoInventario, registrarPerdidaInventario } = require('./service');
const { registrarAuditoria } = require('../auditoria/service');

const buildRunner = (stockActual = 10) => ({
  execute: jest.fn()
    .mockResolvedValueOnce([[{ id: 5, nombre: 'Leche', stock_actual: stockActual }]])
    .mockResolvedValueOnce([{ affectedRows: 1 }])
    .mockResolvedValueOnce([{ insertId: 1 }])
});

describe('inventario service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('registra una salida y actualiza stock con movimiento y auditoria', async () => {
    const runner = buildRunner(10);

    const result = await registrarMovimientoInventario(runner, {
      req: { auth: { sub: 7 } },
      productoId: 5,
      tipo: 'VENTA',
      cantidad: 3,
      direccion: 'SALIDA',
      referenciaTipo: 'VENTA',
      referenciaId: 99,
      motivo: 'Venta #99'
    });

    expect(result).toEqual({ productoId: 5, stockAnterior: 10, stockNuevo: 7 });
    expect(runner.execute).toHaveBeenNthCalledWith(2, 'UPDATE productos SET stock_actual = ? WHERE id = ?', [7, 5]);
    expect(runner.execute.mock.calls[2][0]).toContain('INSERT INTO inventario_movimientos');
    expect(registrarAuditoria).toHaveBeenCalledWith(runner, expect.objectContaining({
      accion: 'INVENTARIO_VENTA',
      entidad: 'producto',
      entidadId: 5
    }));
  });

  test('registra una entrada y aumenta stock', async () => {
    const runner = buildRunner(4);

    const result = await registrarMovimientoInventario(runner, {
      productoId: 5,
      tipo: 'COMPRA_RECIBIDA',
      cantidad: 6,
      direccion: 'ENTRADA'
    });

    expect(result.stockNuevo).toBe(10);
    expect(runner.execute).toHaveBeenNthCalledWith(2, 'UPDATE productos SET stock_actual = ? WHERE id = ?', [10, 5]);
  });

  test('rechaza salidas que dejarian stock negativo', async () => {
    const runner = buildRunner(2);

    await expect(registrarMovimientoInventario(runner, {
      productoId: 5,
      tipo: 'VENTA',
      cantidad: 3,
      direccion: 'SALIDA'
    })).rejects.toThrow('Stock insuficiente');

    expect(runner.execute).toHaveBeenCalledTimes(1);
  });

  test('registra perdida solo con tipo valido y motivo', async () => {
    const runner = buildRunner(8);

    await registrarPerdidaInventario(runner, {
      productoId: 5,
      cantidad: 2,
      tipo: 'MERMA',
      motivo: 'Producto derramado'
    });

    expect(runner.execute.mock.calls[2][1][1]).toBe('PERDIDA_MERMA');
  });

  test('rechaza perdida sin motivo', async () => {
    const runner = buildRunner(8);

    await expect(registrarPerdidaInventario(runner, {
      productoId: 5,
      cantidad: 1,
      tipo: 'ROBO',
      motivo: ''
    })).rejects.toThrow('Debe indicar el motivo');
  });
});
