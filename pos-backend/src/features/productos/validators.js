/*
 * MAPA DEL ARCHIVO: VALIDADOR BACKEND
 * UBICACION: pos-backend/src/features/productos/validators.js
 * QUE HACE: Valida y limpia datos antes de guardar o procesar.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const parseNumberField = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

// LOGICA: normalize Codigo Barras concentra una operacion de este archivo.
const normalizeCodigoBarras = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

// LOGICA: validate Codigo Barras concentra una operacion de este archivo.
const validateCodigoBarras = (codigoBarras) => {
  const normalized = normalizeCodigoBarras(codigoBarras);
  if (normalized && normalized.length > 80) {
    throw new Error('El código de barras no puede superar 80 caracteres.');
  }
  return normalized;
};

const normalizeDateOnly = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const normalized = String(value).trim();
  if (normalized === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('La fecha de vencimiento no es valida.');
  }
  return normalized;
};

const getTodayDateOnly = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const validateFechaVencimiento = (fechaVencimiento) => {
  const normalized = normalizeDateOnly(fechaVencimiento);
  if (!normalized) return normalized;
  if (normalized < getTodayDateOnly()) {
    throw new Error('La fecha de vencimiento no puede ser anterior a hoy.');
  }
  return normalized;
};

// LOGICA: validate Producto Numbers concentra una operacion de este archivo.
const validateProductoNumbers = ({ precioVenta, precioCompra, stockActual, stockMinimo }, { creating = false } = {}) => {
  const precioVentaValue = parseNumberField(precioVenta);
  const precioCompraValue = parseNumberField(precioCompra);
  const stockActualValue = parseNumberField(stockActual);
  const stockMinimoValue = parseNumberField(stockMinimo);

  if (creating && (precioVentaValue === null || Number.isNaN(precioVentaValue))) {
    throw new Error('El precio de venta es obligatorio.');
  }
  if (precioVentaValue !== null && (Number.isNaN(precioVentaValue) || precioVentaValue <= 0)) {
    throw new Error('El precio de venta debe ser mayor a 0.');
  }
  if (precioCompraValue !== null && (Number.isNaN(precioCompraValue) || precioCompraValue < 0)) {
    throw new Error('El precio de compra no puede ser negativo.');
  }
  if (stockActualValue !== null && (!Number.isInteger(stockActualValue) || stockActualValue < 0)) {
    throw new Error('El stock actual no puede ser negativo.');
  }
  if (stockMinimoValue !== null && (!Number.isInteger(stockMinimoValue) || stockMinimoValue < 0)) {
    throw new Error('El stock mínimo no puede ser negativo.');
  }

  return {
    precioVentaValue,
    precioCompraValue,
    stockActualValue,
    stockMinimoValue
  };
};

module.exports = {
  parseNumberField,
  normalizeCodigoBarras,
  validateCodigoBarras,
  validateFechaVencimiento,
  validateProductoNumbers
};
