export interface VentaClienteInfo {
  clienteNombre?: string | null;
  clienteDni?: string | null;
}

const STORAGE_KEY = 'ventasClienteMap';

type VentasClienteMap = Record<string, VentaClienteInfo>;

export const loadVentasClienteMap = (): VentasClienteMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as VentasClienteMap;
  } catch {
    return {};
  }
};

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('ventaClienteUpdate'));
};
