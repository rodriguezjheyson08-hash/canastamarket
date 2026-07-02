jest.mock('../db/pool', () => ({ query: jest.fn(), execute: jest.fn() }));
jest.mock('../utils/ensureProveedoresSchema', () => ({ ensureProveedoresSchema: jest.fn() }));

const pool = require('../db/pool');
const { deleteProveedor } = require('./proveedoresController');

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
});

describe('eliminación de proveedor', () => {
  beforeEach(() => jest.clearAllMocks());

  test('bloquea la eliminación cuando tiene pedidos', async () => {
    pool.query.mockResolvedValue([[{ total: 1 }]]);
    const res = response();
    await deleteProveedor({ params: { id: '5' } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('tiene pedidos') }));
    expect(pool.execute).not.toHaveBeenCalled();
  });

  test('da de baja al proveedor sin pedidos', async () => {
    pool.query.mockResolvedValue([[{ total: 0 }]]);
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    const res = response();
    await deleteProveedor({ params: { id: '5' } }, res);
    expect(pool.execute).toHaveBeenCalledWith('UPDATE proveedores SET activo = 0 WHERE id = ?', ['5']);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
