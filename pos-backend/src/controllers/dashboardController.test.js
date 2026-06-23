jest.mock('../db/pool', () => ({
  getConnection: jest.fn()
}));

jest.mock('../features/pedidosOnline/schema', () => ({
  ensurePedidosOnlineSchema: jest.fn()
}));

const pool = require('../db/pool');
const { ensurePedidosOnlineSchema } = require('../features/pedidosOnline/schema');
const { getStats } = require('./dashboardController');

const row = (total) => [[{ total }]];

describe('dashboardController', () => {
  let connection;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    connection = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.getConnection.mockResolvedValue(connection);
    ensurePedidosOnlineSchema.mockResolvedValue(undefined);
    res = { json: jest.fn() };
  });

  test('calcula el resumen diario con ventas presenciales y pedidos online recogidos', async () => {
    connection.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce(row(17))
      .mockResolvedValueOnce(row(4))
      .mockResolvedValueOnce(row(2))
      .mockResolvedValueOnce(row(1))
      .mockResolvedValueOnce(row('24.00'))
      .mockResolvedValueOnce(row('8.50'))
      .mockResolvedValueOnce(row('3'))
      .mockResolvedValueOnce(row('2'));

    await getStats({}, res);

    expect(connection.query).toHaveBeenNthCalledWith(1, 'SET time_zone = ?', ['-05:00']);
    expect(res.json).toHaveBeenCalledWith({
      productosActivos: 17,
      ventasHoy: 3,
      ingresosHoy: 32.5,
      productosBajos: 4,
      productosVendidos: 5
    });
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('usa rangos de fecha indexables y no DATE(fecha)', async () => {
    connection.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0))
      .mockResolvedValueOnce(row(0));

    await getStats({}, res);

    const dailyQueries = connection.query.mock.calls
      .slice(3)
      .map(([sql]) => String(sql));
    expect(dailyQueries.every((sql) => !/DATE\s*\(\s*(?:v\.|po\.)?fecha/i.test(sql))).toBe(true);
    expect(dailyQueries.every((sql) => sql.includes('CURDATE()'))).toBe(true);
  });

  test('libera la conexion aun cuando falla una consulta', async () => {
    connection.query.mockResolvedValueOnce([{}]).mockRejectedValueOnce(new Error('db error'));

    await expect(getStats({}, res)).rejects.toThrow('db error');
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
