export interface VentaVendedorInfo {
  vendedorId?: number | null;
  vendedorUsuario?: string | null;
  vendedorNombre?: string | null;
}

const STORAGE_KEY = 'ventasVendedorMap';

type VentasVendedorMap = Record<string, VentaVendedorInfo>;

export const loadVentasVendedorMap = (): VentasVendedorMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as VentasVendedorMap;
  } catch {
    return {};
  }
};

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('ventaVendedorUpdate'));
};
