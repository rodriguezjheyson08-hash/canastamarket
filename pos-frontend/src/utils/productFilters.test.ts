/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/productFilters.test.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// TEST FRONTEND - FILTROS DE PRODUCTOS:
// Prueba que la busqueda y filtros de productos funcionen con distintos criterios.
// TEST FRONTEND - CAMBIOS: aqui se agregan casos cuando cambian filtros de productos.
import { Producto } from '../types';
import { filtrarProductosParaGestion, filtrarProductosParaVentas } from './productFilters';

const productos: Producto[] = [
  {
    id: 1,
    nombre: 'Cerveza Corona',
    descripcion: 'Botella 355 ml',
    precioVenta: 8,
    codigoBarras: '7750001112223',
    stockActual: 17,
    categoriaId: 10
  },
  {
    id: 2,
    nombre: 'Doritos',
    descripcion: 'Snack picante',
    precioVenta: 2,
    codigoBarras: '7750003334445',
    stockActual: 12,
    categoriaId: 20
  },
  {
    id: 3,
    nombre: 'Camara',
    descripcion: 'Lector para caja',
    precioVenta: 80,
    codigoBarras: '7754617134520',
    stockActual: 11,
    categoriaId: 30
  }
];

const categoriaNombrePorId = {
  10: 'Licores',
  20: 'Snacks',
  30: 'Electronica'
};

describe('filtros de productos', () => {
  describe('seccion Productos', () => {
    it('busca por nombre sin importar mayusculas', () => {
      const result = filtrarProductosParaGestion(productos, 'corona', 0, categoriaNombrePorId);

      expect(result.map(producto => producto.id)).toEqual([1]);
    });

    it('busca por codigo de barras', () => {
      const result = filtrarProductosParaGestion(productos, '7750003334445', 0, categoriaNombrePorId);

      expect(result.map(producto => producto.id)).toEqual([2]);
    });

    it('filtra por categoria y luego por texto', () => {
      const result = filtrarProductosParaGestion(productos, 'botella', 10, categoriaNombrePorId);

      expect(result.map(producto => producto.id)).toEqual([1]);
    });

    it('no muestra productos de otra categoria aunque coincidan con el texto', () => {
      const result = filtrarProductosParaGestion(productos, 'lector', 10, categoriaNombrePorId);

      expect(result).toEqual([]);
    });
  });

  describe('seccion Ventas', () => {
    it('filtra productos por categoria', () => {
      const result = filtrarProductosParaVentas(productos, '', 20, categoriaNombrePorId);

      expect(result.map(producto => producto.id)).toEqual([2]);
    });

    it('busca por nombre, descripcion, codigo o nombre de categoria', () => {
      const result = filtrarProductosParaVentas(productos, 'snacks', 0, categoriaNombrePorId);

      expect(result.map(producto => producto.id)).toEqual([2]);
    });

    it('prioriza el codigo exacto escaneado sobre el filtro de categoria', () => {
      const result = filtrarProductosParaVentas(productos, '7754617134520', 10, categoriaNombrePorId);

      expect(result.map(producto => producto.id)).toEqual([3]);
    });

    it('ordena alfabeticamente los resultados mostrados en ventas', () => {
      const result = filtrarProductosParaVentas(productos, '', 0, categoriaNombrePorId);

      expect(result.map(producto => producto.nombre)).toEqual(['Camara', 'Cerveza Corona', 'Doritos']);
    });
  });
});
