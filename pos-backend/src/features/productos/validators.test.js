/*
 * MAPA DEL ARCHIVO: LOGICA BACKEND
 * UBICACION: pos-backend/src/features/productos/validators.test.js
 * QUE HACE: Logica especifica de un modulo de negocio.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// TEST BACKEND - VALIDADORES DE PRODUCTOS:
// Prueba que las reglas de codigo de barras, precios y stock acepten/rechacen datos correctamente.
// TEST BACKEND - CAMBIOS: aqui se agregan casos cuando cambian reglas de productos.
const {
  normalizeCodigoBarras,
  validateCodigoBarras,
  validateProductoNumbers
} = require('./validators');

describe('validadores de productos', () => {
  describe('normalizeCodigoBarras', () => {
    test('devuelve null cuando el código está vacío', () => {
      expect(normalizeCodigoBarras('')).toBeNull();
      expect(normalizeCodigoBarras('   ')).toBeNull();
      expect(normalizeCodigoBarras(null)).toBeNull();
      expect(normalizeCodigoBarras(undefined)).toBeNull();
    });

    test('quita espacios del código escaneado', () => {
      expect(normalizeCodigoBarras(' 7750182006194 ')).toBe('7750182006194');
    });
  });

  describe('validateCodigoBarras', () => {
    test('acepta códigos de hasta 80 caracteres', () => {
      expect(validateCodigoBarras('7750182006194')).toBe('7750182006194');
    });

    test('rechaza códigos de más de 80 caracteres', () => {
      expect(() => validateCodigoBarras('1'.repeat(81)))
        .toThrow('El código de barras no puede superar 80 caracteres.');
    });
  });

  describe('validateProductoNumbers', () => {
    test('convierte números válidos enviados como texto', () => {
      expect(validateProductoNumbers({
        precioVenta: '8.50',
        precioCompra: '6',
        stockActual: '10',
        stockMinimo: '2'
      }, { creating: true })).toEqual({
        precioVentaValue: 8.5,
        precioCompraValue: 6,
        stockActualValue: 10,
        stockMinimoValue: 2
      });
    });

    test('exige precio de venta al crear', () => {
      expect(() => validateProductoNumbers({
        precioVenta: '',
        precioCompra: '',
        stockActual: '0',
        stockMinimo: '0'
      }, { creating: true })).toThrow('El precio de venta es obligatorio.');
    });

    test('rechaza precio de venta menor o igual a cero', () => {
      expect(() => validateProductoNumbers({
        precioVenta: '0',
        precioCompra: '',
        stockActual: '0',
        stockMinimo: '0'
      }, { creating: true })).toThrow('El precio de venta debe ser mayor a 0.');
    });

    test('rechaza stock negativo', () => {
      expect(() => validateProductoNumbers({
        precioVenta: '5',
        precioCompra: '',
        stockActual: '-1',
        stockMinimo: '0'
      }, { creating: true })).toThrow('El stock actual no puede ser negativo.');
    });

    test('rechaza stock decimal', () => {
      expect(() => validateProductoNumbers({
        precioVenta: '5',
        precioCompra: '',
        stockActual: '1.5',
        stockMinimo: '0'
      }, { creating: true })).toThrow('El stock actual no puede ser negativo.');
    });
  });
});
