/*
 * MAPA DEL ARCHIVO: MAPPER BACKEND
 * UBICACION: pos-backend/src/features/ventas/mappers.js
 * QUE HACE: Convierte datos de base de datos/API al formato que espera el frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// MAPPER BACKEND - VENTAS:
// Convierte filas SQL de ventas/productos vendidos al formato JSON que espera React.
// LOGICA BACKEND - CAMBIOS: aqui se modifica el formato JSON que reciben las pantallas de ventas.
const mapVenta = (ventaRow, detalleRows, pagoRows = []) => ({
  id: ventaRow.id,
  total: Number(ventaRow.total),
  fecha: ventaRow.fecha instanceof Date ? ventaRow.fecha.toISOString() : ventaRow.fecha,
  estado: ventaRow.estado || 'ACTIVA',
  anuladaMotivo: ventaRow.anulada_motivo || null,
  anuladaAt: ventaRow.anulada_at instanceof Date ? ventaRow.anulada_at.toISOString() : ventaRow.anulada_at || null,
  metodoPago: ventaRow.metodo_pago,
  recibido: ventaRow.recibido !== null ? Number(ventaRow.recibido) : null,
  vuelto: ventaRow.vuelto !== null ? Number(ventaRow.vuelto) : null,
  clienteDni: ventaRow.cliente_dni || null,
  clienteNombre: ventaRow.cliente_nombre || null,
  tipoComprobante: ventaRow.tipo_comprobante || null,
  clienteTipoDocumento: ventaRow.cliente_tipo_documento || null,
  clienteNumeroDocumento: ventaRow.cliente_numero_documento || ventaRow.cliente_dni || ventaRow.cliente_ruc || null,
  clienteRuc: ventaRow.cliente_ruc || null,
  clienteDireccion: ventaRow.cliente_direccion || null,
  vendedorId: ventaRow.vendedor_id !== null && ventaRow.vendedor_id !== undefined ? Number(ventaRow.vendedor_id) : null,
  vendedorUsuario: ventaRow.vendedor_usuario || null,
  vendedorNombre: ventaRow.vendedor_nombre || null,
  pagoReferencia: ventaRow.pago_referencia || null,
  pagoConfirmadoAt: ventaRow.pago_confirmado_at
    ? (ventaRow.pago_confirmado_at instanceof Date ? ventaRow.pago_confirmado_at.toISOString() : ventaRow.pago_confirmado_at)
    : null,
  cajaSesionId: ventaRow.caja_sesion_id !== null && ventaRow.caja_sesion_id !== undefined
    ? Number(ventaRow.caja_sesion_id)
    : null,
  pagos: pagoRows.map((pago) => ({
    metodo: pago.metodo,
    monto: Number(pago.monto),
    recibido: pago.recibido !== null ? Number(pago.recibido) : null,
    vuelto: Number(pago.vuelto || 0),
    referencia: pago.referencia || null
  })),
  productosVendidos: detalleRows.map((detalle) => ({
    producto: {
      id: detalle.producto_id,
      nombre: detalle.nombre,
      descripcion: detalle.descripcion,
      precioVenta: Number(detalle.precio_unitario ?? detalle.precio_venta),
      precioCompra: detalle.precio_compra !== null && detalle.precio_compra !== undefined ? Number(detalle.precio_compra) : null,
      codigoBarras: detalle.codigo_barras,
      stockActual: Number(detalle.stock_actual),
      categoriaId: detalle.categoria_id,
      imagen: detalle.imagen
    },
    cantidad: Number(detalle.cantidad)
  }))
});

module.exports = { mapVenta };
