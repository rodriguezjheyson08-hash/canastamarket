const METODOS_PAGO = new Set(['efectivo', 'yape', 'mercadopago', 'mercadopago_link']);
const money = (value) => Number(Number(value || 0).toFixed(2));

const prepararPagosVenta = ({ pagos, metodoPago, recibido, referencia, total }) => {
  const metodoLower = String(metodoPago || 'efectivo').trim().toLowerCase();
  const totalVenta = money(total);
  if (!Array.isArray(pagos) && !METODOS_PAGO.has(metodoLower)) throw new Error('Método de pago inválido.');

  const preparados = Array.isArray(pagos) && pagos.length > 0
    ? pagos.map((pago) => ({
        metodo: String(pago?.metodo || '').trim().toLowerCase(),
        monto: money(pago?.monto),
        recibido: pago?.recibido === null || pago?.recibido === undefined || pago?.recibido === '' ? null : money(pago.recibido),
        referencia: String(pago?.referencia || '').trim() || null
      }))
    : [{ metodo: metodoLower, monto: totalVenta, recibido: metodoLower === 'efectivo' ? money(recibido) : totalVenta, referencia: String(referencia || '').trim() || null }];

  if (preparados.length === 0 || preparados.length > METODOS_PAGO.size) throw new Error('Detalle de pagos inválido.');
  const usados = new Set();
  for (const pago of preparados) {
    if (!METODOS_PAGO.has(pago.metodo)) throw new Error('Método de pago inválido.');
    if (usados.has(pago.metodo)) throw new Error('No repitas un método de pago.');
    usados.add(pago.metodo);
    if (!Number.isFinite(pago.monto) || pago.monto <= 0) throw new Error('Cada pago debe ser mayor a cero.');
    if (pago.metodo === 'efectivo') {
      pago.recibido = pago.recibido === null ? pago.monto : pago.recibido;
      if (pago.recibido < pago.monto) throw new Error('El efectivo recibido es insuficiente.');
      pago.vuelto = money(pago.recibido - pago.monto);
    } else {
      pago.recibido = pago.monto;
      pago.vuelto = 0;
    }
  }
  const totalPagado = money(preparados.reduce((sum, pago) => sum + pago.monto, 0));
  if (Math.abs(totalPagado - totalVenta) > 0.01) throw new Error('La suma de los pagos debe ser igual al total de la venta.');
  return preparados;
};

module.exports = { prepararPagosVenta, money, METODOS_PAGO };
