/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/productFilters.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { Producto } from '../types';

export type CategoriaNombrePorId = Record<number, string>;

const normalizarBusqueda = (value: string) => value.trim().toLowerCase();

const productoCoincideConTexto = (
  producto: Producto,
  query: string,
  categoriaNombrePorId: CategoriaNombrePorId
) => {
  const categoriaNombre = categoriaNombrePorId[producto.categoriaId] || '';

  return [
    producto.nombre,
    producto.descripcion,
    producto.codigoBarras,
    categoriaNombre
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
};

// LOGICA: filtrar Productos Para Gestion encapsula una operacion reutilizable.
export const filtrarProductosParaGestion = (
  productos: Producto[],
  busqueda: string,
  categoriaSeleccionada: number,
  categoriaNombrePorId: CategoriaNombrePorId
) => {
  const query = normalizarBusqueda(busqueda);

  return productos.filter((producto) => {
    const cumpleCategoria = categoriaSeleccionada === 0 || producto.categoriaId === categoriaSeleccionada;
    if (!cumpleCategoria) return false;
    if (!query) return true;

    return productoCoincideConTexto(producto, query, categoriaNombrePorId);
  });
};

// LOGICA: filtrar Productos Para Ventas encapsula una operacion reutilizable.
export const filtrarProductosParaVentas = (
  productos: Producto[],
  busquedaOCodigo: string,
  categoriaFiltro: number,
  categoriaNombrePorId: CategoriaNombrePorId
) => {
  const query = normalizarBusqueda(busquedaOCodigo);
  const exactBarcodeMatch = query
    ? productos.find(producto => producto.codigoBarras?.trim().toLowerCase() === query)
    : null;

  const base = exactBarcodeMatch ? [exactBarcodeMatch] : productos.filter((producto) => {
    const cumpleCategoria = categoriaFiltro === 0 || producto.categoriaId === categoriaFiltro;
    if (!cumpleCategoria) return false;
    if (!query) return true;

    return productoCoincideConTexto(producto, query, categoriaNombrePorId);
  });

  return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
};
