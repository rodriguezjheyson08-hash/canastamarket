/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/productStock.ts
 * QUE HACE: Funciones auxiliares para stock bajo y pedido a proveedor.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { Producto } from '../types';

export type PedidoProductoItem = {
  producto: Producto;
  cantidad: number;
};

// LOGICA PRODUCTOS: define si un producto necesita reposicion.
export const isProductoBajoStock = (producto: Producto) => {
  const minimo = Number(producto.stockMinimo ?? 0);
  return minimo > 0 ? producto.stockActual <= minimo : producto.stockActual < 10;
};

// LOGICA PEDIDO: calcula una cantidad sugerida para reponer inventario.
export const getCantidadSugeridaPedido = (producto: Producto) => {
  const minimo = Number(producto.stockMinimo ?? 0);
  const objetivo = minimo > 0 ? minimo * 2 : 10;
  return Math.max(1, objetivo - Number(producto.stockActual || 0));
};

// LOGICA PEDIDO: normaliza cantidades digitadas en el modal de pedido.
export const normalizePedidoCantidad = (value: string | number) => Math.max(1, Math.floor(Number(value) || 1));

// LOGICA PEDIDO: convierte el mapa productoId/cantidad en filas ordenadas para mostrar y enviar.
export const buildPedidoProductos = (
  pedidoItems: Record<number, number>,
  productos: Producto[]
): PedidoProductoItem[] => (
  Object.entries(pedidoItems)
    .map(([productoId, cantidad]) => {
      const producto = productos.find((item) => item.id === Number(productoId));
      return producto ? { producto, cantidad: normalizePedidoCantidad(cantidad) } : null;
    })
    .filter((item): item is PedidoProductoItem => Boolean(item))
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre))
);

// LOGICA PEDIDO: suma las cantidades de productos agregados al pedido.
export const getTotalPedidoCantidad = (pedidoProductos: PedidoProductoItem[]) => (
  pedidoProductos.reduce((sum, item) => sum + item.cantidad, 0)
);
