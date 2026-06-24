import {
  canUseMercadoPagoBackUrls,
  clampQuantity,
  formatMetodoPagoBoleta,
  getBoletaResumenTributario,
  montoEnLetras,
  normalizeDecimalInput,
  parseQuantityInput
} from './utils';
import { Venta } from '../../types';

describe('logica del modulo de ventas', () => {
  test('normaliza montos y limita cantidades al stock disponible', () => {
    expect(normalizeDecimalInput('S/ 12,345')).toBe('12.34');
    expect(clampQuantity(8, 5)).toBe(5);
    expect(parseQuantityInput('3 unidades', 10)).toBe(3);
  });

  test('solo envia retornos seguros a Mercado Pago', () => {
    expect(canUseMercadoPagoBackUrls('https://canastamarket.online')).toBe(true);
    expect(canUseMercadoPagoBackUrls('http://localhost:3000')).toBe(false);
    expect(canUseMercadoPagoBackUrls('no-es-url')).toBe(false);
  });

  test('calcula total, base e IGV de una venta', () => {
    const venta = {
      id: 1,
      total: 118,
      productosVendidos: []
    } as unknown as Venta;

    expect(getBoletaResumenTributario(venta, 'boleta')).toEqual({
      opGravada: 100,
      igv: 18,
      opInafecta: 0,
      opExonerada: 0,
      isc: 0,
      total: 118
    });
    expect(montoEnLetras(118.5)).toBe('SON: CIENTO DIECIOCHO CON 50/100 SOLES');
    expect(formatMetodoPagoBoleta('mercadopago')).toBe('Mercado Pago');
  });
});
