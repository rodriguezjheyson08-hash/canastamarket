/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/ventasClienteMap.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
export interface VentaClienteInfo {
  clienteNombre?: string | null;
  clienteDni?: string | null;
}

// CONSTANTE: STORAGE_KEY guarda configuracion o valor fijo del archivo.
const STORAGE_KEY = 'ventasClienteMap';

type VentasClienteMap = Record<string, VentaClienteInfo>;

export const loadVentasClienteMap = (): VentasClienteMap => {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as VentasClienteMap;
  } catch {
    return {};
  }
};

// LOGICA: save Venta Cliente Info encapsula una operacion reutilizable.
export const saveVentaClienteInfo = (ventaId: number, info: VentaClienteInfo) => {
  if (!ventaId) return;
  const nombre = String(info.clienteNombre || '').trim();
  const dni = String(info.clienteDni || '').trim();
  if (!nombre && !dni) return;

  const map = loadVentasClienteMap();
  map[String(ventaId)] = {
    clienteNombre: nombre || null,
    clienteDni: dni || null
  };
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  globalThis.dispatchEvent(new Event('ventaClienteUpdate'));
};
