/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/catalogAvailability.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const REMOVED_CATEGORY_NAMES = ['servicios'];
const REMOVED_PRODUCT_TERMS = ['billar'];

const normalizeCatalogText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

// LOGICA: is Removed Category Name concentra una operacion de este archivo.
const isRemovedCategoryName = (value) =>
  REMOVED_CATEGORY_NAMES.includes(normalizeCatalogText(value));

const hasRemovedProductTerm = (...values) => {
  const text = values.map(normalizeCatalogText).join(' ');
  return REMOVED_PRODUCT_TERMS.some((term) => text.includes(term));
};

// LOGICA: category Availability Sql concentra una operacion de este archivo.
const categoryAvailabilitySql = (categoryAlias = 'c') =>
  `LOWER(TRIM(${categoryAlias}.nombre)) <> 'servicios'`;

const productAvailabilitySql = (productAlias = 'p', categoryAlias = 'c', options = {}) => `
  ${productAlias}.activo = 1
  AND (${categoryAlias}.nombre IS NULL OR ${categoryAvailabilitySql(categoryAlias)})
  AND LOWER(COALESCE(${productAlias}.nombre, '')) NOT LIKE '%billar%'
  AND LOWER(COALESCE(${productAlias}.descripcion, '')) NOT LIKE '%billar%'
  ${options.includeExpired ? '' : `AND (${productAlias}.fecha_vencimiento IS NULL OR ${productAlias}.fecha_vencimiento >= CURRENT_DATE())`}
`;

module.exports = {
  categoryAvailabilitySql,
  hasRemovedProductTerm,
  isRemovedCategoryName,
  productAvailabilitySql
};
