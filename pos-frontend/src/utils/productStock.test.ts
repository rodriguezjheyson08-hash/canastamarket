/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/productStock.test.ts
 * QUE HACE: Pruebas unitarias de stock bajo y pedido a proveedor.
 * GUIA: usa comentarios TEST/DATOS/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
// TEST FRONTEND - STOCK Y PEDIDO A PROVEEDOR:
// Prueba que las reglas de bajo stock y armado del pedido funcionen con distintos casos.
// TEST FRONTEND - CAMBIOS: aqui se agregan casos cuando cambian reglas de reposicion.
import { Producto } from '../types';
import {
  buildPedidoProductos,
  getCantidadSugeridaPedido,
  getTotalPedidoCantidad,
  isProductoBajoStock,
  normalizePedidoCantidad
} from './productStock';

// DATOS TEST: productos usados para validar stock bajo y pedido a proveedor.
const productos: Producto[] = [
  {
    id: 1,
    nombre: 'Aceite',
    descripcion: 'Botella 1L',
    precioVenta: 8,
    stockActual: 4,
    stockMinimo: 5,
    categoriaId: 10
  },
  {
    id: 2,
    nombre: 'Arroz',
    descripcion: 'Bolsa 5kg',
    precioVenta: 18,
    stockActual: 12,
    stockMinimo: 5,
    categoriaId: 10
  },
  {
    id: 3,
    nombre: 'Fideos',
    descripcion: 'Paquete 500g',
    precioVenta: 3,
    stockActual: 9,
    categoriaId: 20
  }
];

describe('control de productos bajo stock y pedido a proveedor', () => {
  describe('stock bajo', () => {
    it('marca como bajo stock cuando el stock actual es menor o igual al mínimo configurado', () => {
      expect(isProductoBajoStock(productos[0])).toBe(true);
    });

    it('no marca bajo stock cuando supera el mínimo configurado', () => {
      expect(isProductoBajoStock(productos[1])).toBe(false);
    });

    it('usa el umbral por defecto menor a 10 cuando no hay stock mínimo', () => {
      expect(isProductoBajoStock(productos[2])).toBe(true);
    });
  });

  describe('pedido a proveedor', () => {
    it('calcula cantidad sugerida hasta duplicar el mínimo configurado', () => {
      expect(getCantidadSugeridaPedido(productos[0])).toBe(6);
    });

    it('calcula cantidad sugerida hasta 10 cuando no hay mínimo configurado', () => {
      expect(getCantidadSugeridaPedido(productos[2])).toBe(1);
    });

    it('normaliza cantidades inválidas a 1', () => {
      expect(normalizePedidoCantidad('')).toBe(1);
      expect(normalizePedidoCantidad('0')).toBe(1);
      expect(normalizePedidoCantidad('-5')).toBe(1);
    });

    it('convierte decimales a enteros para el pedido', () => {
      expect(normalizePedidoCantidad('3.9')).toBe(3);
    });

    it('arma el detalle del pedido ordenado por nombre y omite productos inexistentes', () => {
      const result = buildPedidoProductos({
        3: 2,
        1: 6,
        999: 4
      }, productos);

      expect(result.map((item) => item.producto.nombre)).toEqual(['Aceite', 'Fideos']);
      expect(result.map((item) => item.cantidad)).toEqual([6, 2]);
    });

    it('suma la cantidad total del pedido', () => {
      const pedidoProductos = buildPedidoProductos({
        1: 6,
        3: 2
      }, productos);

      expect(getTotalPedidoCantidad(pedidoProductos)).toBe(8);
    });
  });
});
