/*
 * MAPA DEL ARCHIVO: MAPPER BACKEND
 * UBICACION: pos-backend/src/features/ventas/mappers.js
 * QUE HACE: Convierte datos de base de datos/API al formato que espera el frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// MAPPER BACKEND - VENTAS:
// Convierte filas SQL de ventas/productos vendidos al formato JSON que espera React.
// LOGICA BACKEND - CAMBIOS: aqui se modifica el formato JSON que reciben las pantallas de ventas.
const mapVenta = (ventaRow, detalleRows) => ({
  id: ventaRow.id,
  total: Number(ventaRow.total),
  fecha: ventaRow.fecha instanceof Date ? ventaRow.fecha.toISOString() : ventaRow.fecha,
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
  productosVendidos: detalleRows.map((detalle) => ({
    producto: {
      id: detalle.producto_id,
      nombre: detalle.nombre,
      descripcion: detalle.descripcion,
      precioVenta: Number(detalle.precio_unitario ?? detalle.precio_venta),
      codigoBarras: detalle.codigo_barras,
      stockActual: Number(detalle.stock_actual),
      categoriaId: detalle.categoria_id,
      imagen: detalle.imagen
    },
    cantidad: Number(detalle.cantidad)
  }))
});

module.exports = { mapVenta };
