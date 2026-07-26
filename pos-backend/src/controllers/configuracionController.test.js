/*
 * MAPA DEL ARCHIVO: PRUEBA BACKEND
 * UBICACION: pos-backend/src/controllers/configuracionController.test.js
 * QUE HACE: Prueba el controlador de configuracion sin tocar MySQL real.
 * GUIA: usa comentarios TEST/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
// MOCK BACKEND: reemplaza el pool MySQL por funciones Jest controladas por cada prueba.
jest.mock('../db/pool', () => ({
  query: jest.fn(),
  execute: jest.fn()
}));

// MOCK BACKEND: evita crear tablas reales durante pruebas unitarias.
jest.mock('../utils/ensureConfiguracionSistemaSchema', () => ({
  ensureConfiguracionSistemaSchema: jest.fn()
}));

jest.mock('../features/auditoria/service', () => ({
  registrarAuditoria: jest.fn()
}));

const pool = require('../db/pool');
const { ensureConfiguracionSistemaSchema } = require('../utils/ensureConfiguracionSistemaSchema');
const {
  getConfiguracionPreviewLogo,
  getConfiguracionPublica,
  getConfiguracionSistema,
  saveConfiguracionSistema
} = require('./configuracionController');

// HELPER TEST: crea un objeto response minimo con status/json espiables.
const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    redirect: jest.fn(),
    set: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('configuracionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureConfiguracionSistemaSchema.mockResolvedValue(undefined);
  });

  describe('getConfiguracionSistema', () => {
    test('devuelve personalizacion y boleta guardadas como JSON', async () => {
      pool.query.mockResolvedValueOnce([
        [
          {
            clave: 'personalizacion',
            valor: JSON.stringify({ appName: 'MINI MARKET', logo: 'logo.png' })
          },
          {
            clave: 'boleta',
            valor: JSON.stringify({ nombre: 'SISTEMA POS', ruc: '20599988877' })
          }
        ]
      ]);
      const res = createResponse();

      await getConfiguracionSistema({}, res);

      expect(ensureConfiguracionSistemaSchema).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT clave, valor FROM configuracion_sistema WHERE clave IN (?, ?, ?)',
        ['personalizacion', 'boleta', 'vueltos']
      );
      expect(res.json).toHaveBeenCalledWith({
        personalizacion: { appName: 'MINI MARKET', logo: 'logo.png' },
        boleta: { nombre: 'SISTEMA POS', ruc: '20599988877' },
        vueltos: null
      });
    });

    test('usa null si no hay registros y objeto vacio si el JSON esta corrupto', async () => {
      pool.query.mockResolvedValueOnce([
        [
          {
            clave: 'personalizacion',
            valor: '{json-invalido'
          }
        ]
      ]);
      const res = createResponse();

      await getConfiguracionSistema({}, res);

      expect(res.json).toHaveBeenCalledWith({
        personalizacion: {},
        boleta: null,
        vueltos: null
      });
    });
  });

  describe('getConfiguracionPublica', () => {
    test('devuelve la personalizacion y boleta publica global', async () => {
      pool.query.mockResolvedValueOnce([[
        { clave: 'personalizacion', valor: JSON.stringify({ appName: 'ECOMARKET', idioma: 'es' }) },
        { clave: 'boleta', valor: JSON.stringify({ telefono: '975929943' }) }
      ]]);
      const res = createResponse();

      await getConfiguracionPublica({}, res);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT clave, valor FROM configuracion_sistema WHERE clave IN (?, ?)',
        ['personalizacion', 'boleta']
      );
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, max-age=0');
      expect(res.json).toHaveBeenCalledWith({
        personalizacion: { appName: 'ECOMARKET', idioma: 'es' },
        boleta: { telefono: '975929943' }
      });
    });
  });

  describe('getConfiguracionPreviewLogo', () => {
    test('devuelve el logo base64 configurado para previews sociales', async () => {
      const pngBase64 = Buffer.from('logo-test').toString('base64');
      pool.query.mockResolvedValueOnce([[
        { clave: 'personalizacion', valor: JSON.stringify({ logo: `data:image/png;base64,${pngBase64}` }) }
      ]]);
      const res = createResponse();

      await getConfiguracionPreviewLogo({}, res);

      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, max-age=0');
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.end).toHaveBeenCalledWith(Buffer.from('logo-test'));
    });
  });

  describe('saveConfiguracionSistema', () => {
    test('rechaza payloads sin personalizacion ni boleta', async () => {
      const req = { body: { delivery: { enabled: true } } };
      const res = createResponse();

      await saveConfiguracionSistema(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No hay configuracion para guardar.' });
      expect(pool.execute).not.toHaveBeenCalled();
    });

    test('guarda personalizacion y boleta permitidas y devuelve lo persistido', async () => {
      const req = {
        body: {
          personalizacion: { appName: 'MINI MARKET', logo: 'data:image/png;base64,abc' },
          boleta: { nombre: 'SISTEMA POS', ruc: '20599988877' },
          delivery: { enabled: true }
        }
      };
      const res = createResponse();
      pool.execute.mockResolvedValue([{}]);
      pool.query.mockResolvedValueOnce([
        [
          {
            clave: 'personalizacion',
            valor: JSON.stringify(req.body.personalizacion)
          },
          {
            clave: 'boleta',
            valor: JSON.stringify(req.body.boleta)
          }
        ]
      ]);

      await saveConfiguracionSistema(req, res);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(pool.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO configuracion_sistema'),
        ['personalizacion', JSON.stringify(req.body.personalizacion)]
      );
      expect(pool.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO configuracion_sistema'),
        ['boleta', JSON.stringify(req.body.boleta)]
      );
      expect(res.json).toHaveBeenCalledWith({
        personalizacion: req.body.personalizacion,
        boleta: req.body.boleta,
        vueltos: null
      });
    });

    test('rechaza configuraciones demasiado grandes', async () => {
      const req = {
        body: {
          personalizacion: { logo: 'x'.repeat(1024 * 1024 * 4) }
        }
      };
      const res = createResponse();

      await saveConfiguracionSistema(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'La configuracion personalizacion es demasiado grande.' });
      expect(pool.execute).not.toHaveBeenCalled();
    });
  });
});
