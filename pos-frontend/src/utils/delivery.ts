import { LatLng } from './geo';

export type TiendaDeliveryConfig = {
  tiendaDireccion: string | null;
  tiendaLat: number | null;
  tiendaLng: number | null;
  deliveryEnabled: boolean;
  deliveryBase: number;
  deliveryPerKm: number;
  deliveryIncludedKm: number;
  deliveryMinFee: number;
  deliverySmallOrderThreshold: number;
  deliverySmallOrderFee: number;
  deliveryMaxKm: number;
};

export type DeliveryQuote = {
  ok: boolean;
  message?: string;
  distanceKm?: number;
  fee?: number;
  breakdown?: {
    base: number;
    perKm: number;
    includedKm: number;
    distanceChargeKm: number;
    smallOrderFee: number;
    minFeeApplied: boolean;
  };
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

// Distancia "en línea recta" (Haversine). Para aproximar distancia de calles,
// se puede aplicar un factor.
export const haversineKm = (a: LatLng, b: LatLng): number => {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

const roundMoney = (value: number) => Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));

export const getDeliveryQuote = (input: {
  tienda: Pick<TiendaDeliveryConfig, 'tiendaLat' | 'tiendaLng' | 'deliveryEnabled'>;
  cliente: { lat: number | null; lng: number | null };
  subtotal: number;
  config: Omit<TiendaDeliveryConfig, 'tiendaLat' | 'tiendaLng' | 'deliveryEnabled' | 'tiendaDireccion'>;
}): DeliveryQuote => {
  if (!input.tienda.deliveryEnabled) {
    return { ok: true, distanceKm: 0, fee: 0 };
  }

  if (input.tienda.tiendaLat === null || input.tienda.tiendaLng === null) {
    return { ok: false, message: 'La tienda aún no configuró su ubicación para calcular delivery.' };
  }

  if (input.cliente.lat === null || input.cliente.lng === null) {
    return { ok: false, message: 'Necesitamos tu ubicación para calcular el delivery (usa “Usar mi ubicación”).' };
  }

  const store: LatLng = { lat: input.tienda.tiendaLat, lng: input.tienda.tiendaLng };
  const customer: LatLng = { lat: input.cliente.lat, lng: input.cliente.lng };

  const straightKm = haversineKm(store, customer);
  const ROAD_FACTOR = 1.25; // aproximación simple (calles vs línea recta)
  const distanceKm = straightKm * ROAD_FACTOR;

  const maxKm = Math.max(0, Number(input.config.deliveryMaxKm || 0));
  if (maxKm > 0 && distanceKm > maxKm) {
    return {
      ok: false,
      distanceKm: roundMoney(distanceKm),
      message: `Fuera de zona de reparto (>${maxKm} km).`
    };
  }

  const base = Math.max(0, Number(input.config.deliveryBase || 0));
  const perKm = Math.max(0, Number(input.config.deliveryPerKm || 0));
  const includedKm = Math.max(0, Number(input.config.deliveryIncludedKm || 0));
  const minFee = Math.max(0, Number(input.config.deliveryMinFee || 0));
  const threshold = Math.max(0, Number(input.config.deliverySmallOrderThreshold || 0));
  const smallFee = Math.max(0, Number(input.config.deliverySmallOrderFee || 0));

  const chargeKm = Math.max(0, distanceKm - includedKm);
  let fee = base + perKm * chargeKm;

  const applySmallFee = threshold > 0 && Number(input.subtotal || 0) > 0 && Number(input.subtotal || 0) < threshold;
  if (applySmallFee) fee += smallFee;

  const beforeMin = fee;
  if (minFee > 0) fee = Math.max(minFee, fee);

  return {
    ok: true,
    distanceKm: roundMoney(distanceKm),
    fee: roundMoney(fee),
    breakdown: {
      base: roundMoney(base),
      perKm: roundMoney(perKm),
      includedKm: roundMoney(includedKm),
      distanceChargeKm: roundMoney(chargeKm),
      smallOrderFee: applySmallFee ? roundMoney(smallFee) : 0,
      minFeeApplied: minFee > 0 && beforeMin < minFee
    }
  };
};

