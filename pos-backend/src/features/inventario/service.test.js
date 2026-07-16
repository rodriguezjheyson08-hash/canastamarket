jest.mock('./schema', () => ({ ensureInventarioSchema: jest.fn() }));
jest.mock('../auditoria/service', () => ({
  getActor: jest.fn(() => ({ usuarioId: 7, usuarioNombre: 'Admin Test' })),
  resolveActor: jest.fn(async () => ({ usuarioId: 7, usuarioNombre: 'Admin Test' })),
  registrarAuditoria: jest.fn()
}));

const { registrarMovimientoInventario, registrarPerdidaInventario } = require('./service');
const { registrarAuditoria } = require('../auditoria/service');

const buildRunner = (stockActual = 10, lotes = []) => ({
  execute: jest.fn(async (sql) => {
    if (sql.includes('SELECT id, nombre, stock_actual FROM productos')) {
      return [[{ id: 5, nombre: 'Leche', stock_actual: stockActual }]];
    }
    if (sql.includes('SELECT id, cantidad_actual')) {
      return [lotes];
    }
    if (sql.includes('INSERT INTO inventario_movimientos')) {
      return [{ insertId: 1 }];
    }
    if (sql.includes('INSERT INTO inventario_lotes')) {
      return [{ insertId: 2 }];
    }
    return [{ affectedRows: 1 }];
  })
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
    expect(runner.execute).toHaveBeenCalledWith('UPDATE productos SET stock_actual = ? WHERE id = ?', [7, 5]);
    expect(runner.execute.mock.calls.some((call) => call[0].includes('INSERT INTO inventario_movimientos'))).toBe(true);
    expect(registrarAuditoria).toHaveBeenCalledWith(runner, expect.objectContaining({
      accion: 'INVENTARIO_VENTA',
      entidad: 'producto',
      entidadId: 5
    }));
  });

  test('registra una entrada y aumenta stock', async () => {
    const runner = buildRunner(4);
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const result = await registrarMovimientoInventario(runner, {
      productoId: 5,
      tipo: 'COMPRA_RECIBIDA',
      cantidad: 6,
      direccion: 'ENTRADA',
      fechaVencimiento: futureDate
    });

    expect(result.stockNuevo).toBe(10);
    expect(runner.execute).toHaveBeenCalledWith('UPDATE productos SET stock_actual = ? WHERE id = ?', [10, 5]);
    expect(runner.execute.mock.calls.some((call) => call[0].includes('INSERT INTO inventario_lotes'))).toBe(true);
  });

  test('rechaza una entrada con fecha de vencimiento pasada', async () => {
    const runner = buildRunner(4);

    await expect(registrarMovimientoInventario(runner, {
      productoId: 5,
      tipo: 'COMPRA_RECIBIDA',
      cantidad: 6,
      direccion: 'ENTRADA',
      fechaVencimiento: '2000-01-01'
    })).rejects.toThrow('La fecha de vencimiento no puede ser anterior a hoy.');
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

    const movimientoCall = runner.execute.mock.calls.find((call) => call[0].includes('INSERT INTO inventario_movimientos'));
    expect(movimientoCall[1][1]).toBe('PERDIDA_MERMA');
  });

  test('registra perdida con tipo personalizado', async () => {
    const runner = buildRunner(8);

    await registrarPerdidaInventario(runner, {
      productoId: 5,
      cantidad: 1,
      tipo: 'Error de conteo',
      motivo: 'Diferencia detectada en inventario fisico'
    });

    const movimientoCall = runner.execute.mock.calls.find((call) => call[0].includes('INSERT INTO inventario_movimientos'));
    expect(movimientoCall[1][1]).toBe('PERDIDA_ERROR_DE_CONTEO');
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
