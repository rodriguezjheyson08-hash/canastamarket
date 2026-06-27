const { prepararPagosVenta } = require('./pagos');

describe('pagos de una venta', () => {
  it('acepta efectivo y Yape cuando juntos cubren el total', () => {
    const pagos = prepararPagosVenta({ total: 50, pagos: [
      { metodo: 'efectivo', monto: 20, recibido: 25 },
      { metodo: 'yape', monto: 30 }
    ] });
    expect(pagos).toEqual([
      expect.objectContaining({ metodo: 'efectivo', monto: 20, recibido: 25, vuelto: 5 }),
      expect.objectContaining({ metodo: 'yape', monto: 30, recibido: 30, vuelto: 0 })
    ]);
  });

  it('rechaza un pago mixto que no suma el total', () => {
    expect(() => prepararPagosVenta({ total: 50, pagos: [
      { metodo: 'efectivo', monto: 10 }, { metodo: 'yape', monto: 30 }
    ] })).toThrow('La suma de los pagos debe ser igual al total de la venta.');
  });

  it('rechaza efectivo recibido menor que la parte asignada', () => {
    expect(() => prepararPagosVenta({ total: 50, pagos: [
      { metodo: 'efectivo', monto: 20, recibido: 15 }, { metodo: 'yape', monto: 30 }
    ] })).toThrow('El efectivo recibido es insuficiente.');
  });

  it('mantiene compatibilidad con ventas de un solo método', () => {
    expect(prepararPagosVenta({ total: 10, metodoPago: 'efectivo', recibido: 20 })).toEqual([
      expect.objectContaining({ metodo: 'efectivo', monto: 10, recibido: 20, vuelto: 10 })
    ]);
  });
});
