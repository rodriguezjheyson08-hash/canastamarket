/*
 * MAPA DEL ARCHIVO: MAPPER BACKEND
 * UBICACION: pos-backend/src/features/pedidosOnline/mappers.js
 * QUE HACE: Convierte filas MySQL de pedidos online al formato usado por React.
 * GUIA: LOGICA DE FORMATO para respuesta JSON del modulo cliente/admin.
 */

// LOGICA - MAPEO DE PEDIDO ONLINE:
// Une cabecera y detalle para que el frontend reciba un objeto listo para mostrar.
const mapPedidoOnline = (pedidoRow, detalleRows = []) => ({
  id: Number(pedidoRow.id),
  codigo: pedidoRow.codigo,
  fecha: pedidoRow.fecha instanceof Date ? pedidoRow.fecha.toISOString() : pedidoRow.fecha,
  estado: pedidoRow.estado,
  metodoPago: pedidoRow.metodo_pago,
  entrega: pedidoRow.entrega,
  cliente: {
    nombre: pedidoRow.cliente_nombre,
    dni: pedidoRow.cliente_dni || '',
    email: pedidoRow.cliente_email,
    telefono: pedidoRow.cliente_telefono || '',
    direccion: pedidoRow.cliente_direccion || ''
  },
  total: Number(pedidoRow.total || 0),
  boletaHtml: pedidoRow.boleta_html || '',
  pagoReferencia: pedidoRow.pago_referencia || '',
  canceladoPor: pedidoRow.cancelado_por || '',
  canceladoAt: pedidoRow.cancelado_at instanceof Date ? pedidoRow.cancelado_at.toISOString() : (pedidoRow.cancelado_at || ''),
  cancelacionMotivo: pedidoRow.cancelacion_motivo || '',
  reembolsoEstado: pedidoRow.reembolso_estado || '',
  productos: detalleRows.map((detalle) => ({
    id: Number(detalle.producto_id),
    nombre: detalle.producto_nombre,
    cantidad: Number(detalle.cantidad),
    precioVenta: Number(detalle.precio_unitario),
    subtotal: Number(detalle.subtotal)
  }))
});

module.exports = {
  mapPedidoOnline
};
