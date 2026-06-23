import { formatBusinessDateTime, getBusinessDateValue } from './businessTime';

describe('businessTime', () => {
  test('clasifica en el dia de Lima una venta cercana a medianoche', () => {
    expect(getBusinessDateValue('2026-06-16T04:30:00.000Z')).toBe('2026-06-15');
  });

  test('formatea siempre usando la zona horaria del negocio', () => {
    expect(formatBusinessDateTime('2026-06-16T04:30:00.000Z')).toMatch(/15\/06\/(?:26|2026)/);
  });

  test('tolera fechas invalidas', () => {
    expect(getBusinessDateValue('fecha-invalida')).toBe('');
    expect(formatBusinessDateTime('fecha-invalida')).toBe('');
  });
});
