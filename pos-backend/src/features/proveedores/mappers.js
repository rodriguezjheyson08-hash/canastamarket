/*
 * MAPA DEL ARCHIVO: MAPPER BACKEND
 * UBICACION: pos-backend/src/features/proveedores/mappers.js
 * QUE HACE: Convierte datos de base de datos/API al formato que espera el frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// LOGICA BACKEND: columnas permitidas para leer proveedores desde MySQL.
const proveedorSelect = `
  id, numero_documento, razon_social, direccion, contacto_nombre, contacto_telefono, contacto_email,
  estado, condicion, distrito, provincia, departamento, activo, created_at, updated_at
`;

// LOGICA BACKEND: convierte nombres snake_case de MySQL a camelCase para React.
const normalizeProveedorRow = (row) => ({
  id: row.id,
  numeroDocumento: row.numero_documento,
  razonSocial: row.razon_social,
  estado: row.estado,
  condicion: row.condicion,
  direccion: row.direccion,
  distrito: row.distrito,
  provincia: row.provincia,
  departamento: row.departamento,
  contactoNombre: row.contacto_nombre,
  contactoTelefono: row.contacto_telefono,
  contactoEmail: row.contacto_email,
  activo: row.activo === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// LOGICA BACKEND: normaliza la respuesta del servicio externo RUC antes de enviarla al frontend.
const normalizeRucApiData = (inputRuc, data) => ({
  numero_documento: String(data?.numero_documento || data?.ruc || data?.numero || inputRuc || '').trim(),
  razon_social: String(data?.razon_social || data?.nombre || data?.razonSocial || '').trim(),
  estado: data?.estado || null,
  condicion: data?.condicion || null,
  direccion: data?.direccion || null,
  distrito: data?.distrito || null,
  provincia: data?.provincia || null,
  departamento: data?.departamento || null
});

// LOGICA BACKEND: adapta una fila SQL de pedido de compra al formato que usa React.
const mapPedidoCompraRow = (row) => ({
  id: row.id,
  proveedorId: row.proveedor_id,
  estado: row.estado,
  notas: row.notas,
  solicitanteDni: row.solicitante_dni,
  solicitanteNombre: row.solicitante_nombre,
  comprador: {
    nombre: row.comprador_nombre,
    ruc: row.comprador_ruc,
    direccion: row.comprador_direccion,
    telefono: row.comprador_telefono
  },
  fecha: row.fecha,
  updatedAt: row.updated_at,
  itemsCount: row.items_count !== undefined ? Number(row.items_count) : undefined,
  totalCantidad: row.total_cantidad !== undefined ? Number(row.total_cantidad) : undefined,
  proveedor: {
    id: row.proveedor_id,
    numeroDocumento: row.numero_documento,
    razonSocial: row.razon_social,
    contactoNombre: row.contacto_nombre,
    contactoTelefono: row.contacto_telefono,
    contactoEmail: row.contacto_email,
    direccion: row.direccion
  }
});

// LOGICA BACKEND: escapa valores para que el CSV no se rompa con punto y coma, comillas o saltos de linea.
const csvEscape = (value) => {
  const raw = value === null || value === undefined ? '' : String(value);
  const escaped = raw.replaceAll('"', '""');
  return /[;"\n\r]/.test(raw) ? `"${escaped}"` : escaped;
};

module.exports = {
  csvEscape,
  mapPedidoCompraRow,
  normalizeProveedorRow,
  normalizeRucApiData,
  proveedorSelect
};
