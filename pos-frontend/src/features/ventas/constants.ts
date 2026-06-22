/*
 * MAPA DEL ARCHIVO: CONSTANTES FRONTEND
 * UBICACION: pos-frontend/src/features/ventas/constants.ts
 * QUE HACE: Valores fijos usados por el modulo.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// CONSTANTE VENTAS: imagen QR usada para pagos con Yape.
export const QR_YAPE = `${process.env.PUBLIC_URL}/images/yape.png`;

// CONSTANTE VENTAS: clave de localStorage para guardar venta pendiente de Mercado Pago.
export const MP_PENDING_SALE_STORAGE_KEY = 'mp_pending_sale';
// CONSTANTE VENTAS: monto minimo aceptado para iniciar pago con Mercado Pago.
export const MP_MIN_AMOUNT = 1;
// CONSTANTE VENTAS: tasa IGV para resumen tributario de boleta electronica.
export const IGV_RATE = 0.18;
// CONSTANTE VENTAS: codigo SUNAT de factura.
export const TIPO_COMPROBANTE_FACTURA = '01';
// CONSTANTE VENTAS: codigo SUNAT de boleta.
export const TIPO_COMPROBANTE_BOLETA = '03';
// CONSTANTE VENTAS: serie por defecto para factura electronica.
export const DEFAULT_FACTURA_SERIE = 'F001';
// CONSTANTE VENTAS: serie por defecto para boleta electronica.
export const DEFAULT_BOLETA_SERIE = 'B001';

// CONSTANTE VENTAS: imagenes externas por nombre para productos de bebidas.
export const imagenesBebidas: Record<string, string> = {
  'Ron Barceló': 'https://www.licoresmedellin.com/cdn/shop/products/ron-barcelo-anejo-700ml.jpg?v=1677692782',
  'Cerveza Corona': 'https://www.latiendadelcervecero.com/cdn/shop/products/Corona355ml.png?v=1614359782',
  'Tequila Don Julio': 'https://cdn.shopify.com/s/files/1/0257/6089/3921/products/tequila-don-julio-reposado-750ml.png?v=1642521072',
  'Whisky Johnnie Walker': 'https://www.licoresmedellin.com/cdn/shop/products/whisky-johnnie-walker-red-label-700ml.jpg?v=1677692782',
  'Vodka Smirnoff': 'https://www.latiendadelcervecero.com/cdn/shop/products/Smirnoff700ml.png?v=1614359782'
};
