jest.mock('../db/pool', () => ({ query: jest.fn(), execute: jest.fn() }));
jest.mock('../utils/ensureProveedoresSchema', () => ({ ensureProveedoresSchema: jest.fn() }));

const pool = require('../db/pool');
const {
  deletePedidoCompra,
  deletePedidosCompraBatch,
  deleteProveedor
} = require('./proveedoresController');

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
});

describe('eliminacion de proveedor', () => {
  beforeEach(() => jest.clearAllMocks());

  test('bloquea la eliminacion cuando tiene pedidos pendientes', async () => {
    pool.query.mockResolvedValue([[{ total: 1 }]]);
    const res = response();

    await deleteProveedor({ params: { id: '5' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('pedidos') }));
    expect(pool.execute).not.toHaveBeenCalled();
  });

  test('da de baja al proveedor sin pedidos pendientes', async () => {
    pool.query.mockResolvedValue([[{ total: 0 }]]);
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    const res = response();

    await deleteProveedor({ params: { id: '5' } }, res);

    expect(pool.execute).toHaveBeenCalledWith('UPDATE proveedores SET activo = 0 WHERE id = ?', ['5']);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('eliminacion de pedidos de compra', () => {
  beforeEach(() => jest.clearAllMocks());

  test('bloquea eliminar un pedido pendiente', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 10, estado: 'BORRADOR' }]]);
    const res = response();

    await deletePedidoCompra({ params: { id: '10' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('pendiente') }));
    expect(pool.execute).not.toHaveBeenCalled();
  });

  test('permite eliminar un pedido recibido', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 10, estado: 'RECIBIDO' }]]);
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = response();

    await deletePedidoCompra({ params: { id: '10' } }, res);

    expect(pool.execute).toHaveBeenCalledWith('DELETE FROM pedidos_compra WHERE id = ?', ['10']);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test('bloquea eliminacion masiva si incluye pedidos pendientes', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 7 }]]);
    const res = response();

    await deletePedidosCompraBatch({ body: { ids: [7, 8] } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ blockedIds: [7] }));
  });

  test('permite eliminacion masiva solo con pedidos recibidos', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 2 }]);
    const res = response();

    await deletePedidosCompraBatch({ body: { ids: [7, 8] } }, res);

    expect(res.json).toHaveBeenCalledWith({ deleted: 2, ids: [7, 8] });
  });
});
