/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/ventasVendedorMap.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
export interface VentaVendedorInfo {
  vendedorId?: number | null;
  vendedorUsuario?: string | null;
  vendedorNombre?: string | null;
}

// CONSTANTE: STORAGE_KEY guarda configuracion o valor fijo del archivo.
const STORAGE_KEY = 'ventasVendedorMap';

type VentasVendedorMap = Record<string, VentaVendedorInfo>;

export const loadVentasVendedorMap = (): VentasVendedorMap => {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as VentasVendedorMap;
  } catch {
    return {};
  }
};

// LOGICA: save Venta Vendedor Info encapsula una operacion reutilizable.
export const saveVentaVendedorInfo = (ventaId: number, info: VentaVendedorInfo) => {
  if (!ventaId) return;
  const vendedorUsuario = String(info.vendedorUsuario || '').trim();
  const vendedorNombre = String(info.vendedorNombre || '').trim();
  const vendedorId = typeof info.vendedorId === 'number' && info.vendedorId > 0 ? info.vendedorId : null;
  if (!vendedorId && !vendedorUsuario && !vendedorNombre) return;

  const map = loadVentasVendedorMap();
  map[String(ventaId)] = {
    vendedorId,
    vendedorUsuario: vendedorUsuario || null,
    vendedorNombre: vendedorNombre || null
  };
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  globalThis.dispatchEvent(new Event('ventaVendedorUpdate'));
};
