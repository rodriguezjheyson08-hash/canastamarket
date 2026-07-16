jest.mock('../db/pool', () => ({
  query: jest.fn(),
  execute: jest.fn()
}));

jest.mock('../features/clientes/schema', () => ({
  ensureClientesSchema: jest.fn()
}));

jest.mock('../utils/passwords', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  needsPasswordRehash: jest.fn()
}));

jest.mock('../utils/tokens', () => ({
  createToken: jest.fn()
}));

const pool = require('../db/pool');
const { ensureClientesSchema } = require('../features/clientes/schema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');
const { PASSWORD_MESSAGE } = require('../features/passwordReset/security');
const {
  registerCliente,
  loginCliente,
  getClienteActual,
  updateClienteActual
} = require('./clientesController');

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
};

const clienteRow = {
  id: 15,
  email: 'cliente@correo.com',
  password: 'hash-guardado',
  nombre_completo: 'Ana Perez',
  dni: '12345678',
  telefono: '999888777',
  direccion: 'Av. Principal 123',
  is_active: 1
};

const clientePublico = {
  id: 15,
  nombre: 'Ana Perez',
  dni: '12345678',
  email: 'cliente@correo.com',
  telefono: '999888777',
  direccion: 'Av. Principal 123'
};

describe('clientesController: registro e inicio de sesion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureClientesSchema.mockResolvedValue(undefined);
    hashPassword.mockReturnValue('hash-generado');
    verifyPassword.mockReturnValue(true);
    needsPasswordRehash.mockReturnValue(false);
    createToken.mockReturnValue('token-cliente');
  });

  describe('perfil autenticado', () => {
    test('devuelve los datos del cliente actual sin exponer la contrasena', async () => {
      const req = { auth: { sub: 15 } };
      const res = createResponse();
      pool.query.mockResolvedValueOnce([[clienteRow]]);

      await getClienteActual(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1',
        [15]
      );
      expect(res.json).toHaveBeenCalledWith(clientePublico);
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('password');
    });

    test('devuelve 404 cuando el perfil autenticado no existe o esta inactivo', async () => {
      const req = { auth: { sub: 99 } };
      const res = createResponse();
      pool.query.mockResolvedValueOnce([[]]);

      await getClienteActual(req, res);

      expect(ensureClientesSchema).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1',
        [99]
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cliente no encontrado.' });
    });

    test('actualiza solo campos editables de un cliente activo', async () => {
      const req = {
        auth: { sub: 15 },
        body: {
          nombre: '  Ana Maria Perez ',
          email: ' nueva@correo.com ',
          dni: '12.345.678',
          telefono: ' 999111222 ',
          direccion: ' Nueva direccion '
        }
      };
      const res = createResponse();
      const updatedRow = {
        ...clienteRow,
        email: 'nueva@correo.com',
        nombre_completo: 'Ana Maria Perez',
        telefono: '999111222',
        direccion: 'Nueva direccion'
      };
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      pool.query.mockResolvedValueOnce([[updatedRow]]);

      await updateClienteActual(req, res);

      expect(pool.execute).toHaveBeenCalledWith(
        'UPDATE clientes SET email = ?, nombre_completo = ?, dni = ?, telefono = ?, direccion = ? WHERE id = ? AND is_active = 1',
        ['nueva@correo.com', 'Ana Maria Perez', '12345678', '999111222', 'Nueva direccion', 15]
      );
      expect(res.json).toHaveBeenCalledWith({
        ...clientePublico,
        email: 'nueva@correo.com',
        nombre: 'Ana Maria Perez',
        telefono: '999111222',
        direccion: 'Nueva direccion'
      });
    });

    test('rechaza una edicion con DNI invalido antes de escribir en MySQL', async () => {
      const req = {
        auth: { sub: 15 },
        body: { nombre: 'Ana Perez', dni: '123', telefono: '999888777' }
      };
      const res = createResponse();

      await updateClienteActual(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(pool.execute).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    test.each([
      ['nombre vacio', { nombre: '   ', email: 'cliente@correo.com', dni: '12345678', telefono: '999888777' }],
      ['correo invalido', { nombre: 'Ana Perez', email: 'correo-malo', dni: '12345678', telefono: '999888777' }],
      ['telefono vacio', { nombre: 'Ana Perez', email: 'cliente@correo.com', dni: '12345678', telefono: '   ' }],
      ['telefono de menos de 9 digitos', { nombre: 'Ana Perez', email: 'cliente@correo.com', dni: '12345678', telefono: '99988877' }]
    ])('rechaza una edicion con %s', async (_caso, body) => {
      const req = { auth: { sub: 15 }, body };
      const res = createResponse();

      await updateClienteActual(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Nombre, correo valido, DNI de 8 digitos y telefono de 9 digitos son obligatorios.'
      });
      expect(pool.execute).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('guarda una direccion vacia como null', async () => {
      const req = {
        auth: { sub: 15 },
        body: {
          nombre: 'Ana Perez',
          email: 'cliente@correo.com',
          dni: '12345678',
          telefono: '999888777',
          direccion: '   '
        }
      };
      const res = createResponse();
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      pool.query.mockResolvedValueOnce([[{ ...clienteRow, direccion: null }]]);

      await updateClienteActual(req, res);

      expect(pool.execute).toHaveBeenCalledWith(
        'UPDATE clientes SET email = ?, nombre_completo = ?, dni = ?, telefono = ?, direccion = ? WHERE id = ? AND is_active = 1',
        ['cliente@correo.com', 'Ana Perez', '12345678', '999888777', null, 15]
      );
      expect(res.json).toHaveBeenCalledWith({ ...clientePublico, direccion: '' });
    });
  });

  describe('registerCliente', () => {
    test('registra un cliente valido y devuelve su token', async () => {
      const req = {
        body: {
          email: '  CLIENTE@Correo.com ',
          password: 'Clave123',
          nombre: '  Ana Perez  ',
          dni: '12.345.678',
          telefono: ' 999888777 ',
          direccion: ' Av. Principal 123 '
        }
      };
      const res = createResponse();
      pool.execute.mockResolvedValueOnce([{ insertId: 15 }]);
      pool.query.mockResolvedValueOnce([[clienteRow]]);

      await registerCliente(req, res);

      expect(ensureClientesSchema).toHaveBeenCalledTimes(1);
      expect(hashPassword).toHaveBeenCalledWith('Clave123');
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clientes'),
        [
          'cliente@correo.com',
          'hash-generado',
          'Ana Perez',
          '12345678',
          '999888777',
          'Av. Principal 123'
        ]
      );
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM clientes WHERE id = ?', [15]);
      expect(createToken).toHaveBeenCalledWith({ sub: 15, role: 'CLIENTE', type: 'cliente' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: 'token-cliente',
        cliente: clientePublico
      });
    });

    test('rechaza datos personales incompletos o invalidos', async () => {
      const req = {
        body: {
          email: 'correo-invalido',
          password: 'Clave123',
          nombre: '',
          dni: '1234',
          telefono: ''
        }
      };
      const res = createResponse();

      await registerCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Nombre, DNI de 8 digitos, correo valido y telefono de 9 digitos son obligatorios.'
      });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(pool.execute).not.toHaveBeenCalled();
    });

    test('rechaza una contrasena debil', async () => {
      const req = {
        body: {
          email: 'cliente@correo.com',
          password: 'debil',
          nombre: 'Ana Perez',
          dni: '12345678',
          telefono: '999888777'
        }
      };
      const res = createResponse();

      await registerCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: PASSWORD_MESSAGE });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(pool.execute).not.toHaveBeenCalled();
    });

    test('devuelve conflicto cuando el correo ya esta registrado', async () => {
      const req = {
        body: {
          email: 'cliente@correo.com',
          password: 'Clave123',
          nombre: 'Ana Perez',
          dni: '12345678',
          telefono: '999888777'
        }
      };
      const res = createResponse();
      pool.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      await registerCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ya existe una cuenta con ese correo.'
      });
      expect(pool.query).not.toHaveBeenCalled();
      expect(createToken).not.toHaveBeenCalled();
    });
  });

  describe('loginCliente', () => {
    test('inicia sesion con credenciales validas y devuelve el cliente', async () => {
      const req = {
        body: { email: ' CLIENTE@Correo.com ', password: 'Clave123' }
      };
      const res = createResponse();
      pool.query.mockResolvedValueOnce([[clienteRow]]);

      await loginCliente(req, res);

      expect(ensureClientesSchema).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM clientes WHERE email = ? LIMIT 1',
        ['cliente@correo.com']
      );
      expect(verifyPassword).toHaveBeenCalledWith('hash-guardado', 'Clave123');
      expect(pool.execute).not.toHaveBeenCalled();
      expect(createToken).toHaveBeenCalledWith({ sub: 15, role: 'CLIENTE', type: 'cliente' });
      expect(res.json).toHaveBeenCalledWith({
        token: 'token-cliente',
        cliente: clientePublico
      });
    });

    test('rechaza una contrasena incorrecta', async () => {
      const req = {
        body: { email: 'cliente@correo.com', password: 'Incorrecta1' }
      };
      const res = createResponse();
      pool.query.mockResolvedValueOnce([[clienteRow]]);
      verifyPassword.mockReturnValueOnce(false);

      await loginCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Correo o contraseña incorrectos.' });
      expect(createToken).not.toHaveBeenCalled();
    });

    test.each([
      ['un correo no registrado', []],
      ['una cuenta inactiva', [{ ...clienteRow, is_active: 0 }]]
    ])('rechaza %s', async (_caso, rows) => {
      const req = {
        body: { email: 'cliente@correo.com', password: 'Clave123' }
      };
      const res = createResponse();
      pool.query.mockResolvedValueOnce([rows]);

      await loginCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Correo o contraseña incorrectos.' });
      expect(createToken).not.toHaveBeenCalled();
    });

    test('actualiza el hash antiguo antes de completar el inicio de sesion', async () => {
      const req = {
        body: { email: 'cliente@correo.com', password: 'Clave123' }
      };
      const res = createResponse();
      pool.query.mockResolvedValueOnce([[{ ...clienteRow, password: 'Clave123' }]]);
      needsPasswordRehash.mockReturnValueOnce(true);
      hashPassword.mockReturnValueOnce('hash-actualizado');
      pool.execute.mockResolvedValueOnce([{}]);

      await loginCliente(req, res);

      expect(needsPasswordRehash).toHaveBeenCalledWith('Clave123');
      expect(hashPassword).toHaveBeenCalledWith('Clave123');
      expect(pool.execute).toHaveBeenCalledWith(
        'UPDATE clientes SET password = ? WHERE id = ?',
        ['hash-actualizado', 15]
      );
      expect(res.json).toHaveBeenCalledWith({
        token: 'token-cliente',
        cliente: clientePublico
      });
    });
  });
});
