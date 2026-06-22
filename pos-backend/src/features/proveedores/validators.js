/*
 * MAPA DEL ARCHIVO: VALIDADOR BACKEND
 * UBICACION: pos-backend/src/features/proveedores/validators.js
 * QUE HACE: Valida y limpia datos antes de guardar o procesar.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// LOGICA BACKEND: valida que el RUC tenga exactamente 11 digitos.
const isRucValido = (ruc) => /^\d{11}$/.test(String(ruc || '').trim());

// LOGICA BACKEND: deja el telefono solo con digitos antes de guardarlo.
const normalizePhoneDigits = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
};

// LOGICA BACKEND: convierte el body recibido del frontend al formato de columnas MySQL.
const toDbProveedor = (body = {}) => {
  const cleanTelefono = normalizePhoneDigits(body.contactoTelefono);
  if (cleanTelefono && !/^\d{9}$/.test(cleanTelefono)) {
    const error = new Error('contactoTelefono debe tener 9 dígitos.');
    error.status = 400;
    throw error;
  }

  return {
    numero_documento: body.numeroDocumento === undefined ? undefined : String(body.numeroDocumento).trim(),
    razon_social: body.razonSocial === undefined ? undefined : String(body.razonSocial).trim(),
    estado: body.estado || null,
    condicion: body.condicion || null,
    direccion: body.direccion || null,
    distrito: body.distrito || null,
    provincia: body.provincia || null,
    departamento: body.departamento || null,
    contacto_nombre: body.contactoNombre || null,
    contacto_telefono: cleanTelefono,
    contacto_email: body.contactoEmail || null
  };
};

module.exports = {
  isRucValido,
  toDbProveedor
};
