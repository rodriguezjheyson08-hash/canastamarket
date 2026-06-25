/*
 * MAPA DEL ARCHIVO: PRUEBA BACKEND
 * UBICACION: pos-backend/src/controllers/categoriasController.test.js
 * QUE HACE: Prueba reglas de negocio de categorias sin tocar MySQL real.
 */
jest.mock('../db/pool', () => ({
  query: jest.fn(),
  execute: jest.fn()
}));

const pool = require('../db/pool');
const {
  createCategoria,
  updateCategoria
} = require('./categoriasController');

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('categoriasController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rechaza crear una categoria con nombre duplicado aunque cambien mayusculas o tildes', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Lácteos' }]]);
    const req = { body: { nombre: 'lacteos', descripcion: '' } };
    const res = createResponse();

    await createCategoria(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ya existe una categoría con ese nombre.' });
    expect(pool.execute).not.toHaveBeenCalled();
  });

  test('bloquea cambiar el nombre de una categoria que tiene productos asociados', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 3, nombre: 'Licores', descripcion: '' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 2 }]]);
    const req = { params: { id: 3 }, body: { nombre: 'Verduras', descripcion: 'Nueva descripción' } };
    const res = createResponse();

    await updateCategoria(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'No se puede cambiar el nombre porque esta categoría tiene productos asociados. Solo se permite renombrar categorías vacías.'
    });
    expect(pool.execute).not.toHaveBeenCalled();
  });

  test('permite editar solo la descripcion aunque la categoria tenga productos', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 3, nombre: 'Licores', descripcion: '' }]])
      .mockResolvedValueOnce([[{ id: 3, nombre: 'Licores', descripcion: 'Bebidas alcohólicas' }]]);
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const req = { params: { id: 3 }, body: { nombre: 'Licores', descripcion: 'Bebidas alcohólicas' } };
    const res = createResponse();

    await updateCategoria(req, res);

    expect(pool.execute).toHaveBeenCalledWith(
      'UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion) WHERE id = ?',
      ['Licores', 'Bebidas alcohólicas', 3]
    );
    expect(res.json).toHaveBeenCalledWith({ id: 3, nombre: 'Licores', descripcion: 'Bebidas alcohólicas' });
  });
});
