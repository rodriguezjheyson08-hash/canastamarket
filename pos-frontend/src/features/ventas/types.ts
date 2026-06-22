/*
 * MAPA DEL ARCHIVO: TIPOS FRONTEND
 * UBICACION: pos-frontend/src/features/ventas/types.ts
 * QUE HACE: Tipos TypeScript propios del modulo.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { Producto } from '../../types';

// TIPOS VENTAS: define el comprobante electronico SUNAT usado en la venta.
export type TipoBoleta = 'boleta' | 'factura';

// TIPOS VENTAS: item del carrito, une producto seleccionado con cantidad.
export interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

// TIPOS VENTAS: datos del cliente que aparecen en la boleta.
export interface ClienteBoleta {
  tipoDocumento: '1' | '6';
  numeroDocumento: string;
  dni: string;
  ruc?: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  razonSocial?: string;
  direccion?: string;
}

// TIPOS VENTAS: venta guardada temporalmente mientras Mercado Pago confirma el pago.
export interface MPPendingSale {
  items: Array<{ productoId: number; cantidad: number }>;
  total: number;
  cliente?: ClienteBoleta | null;
  externalReference?: string | null;
  tipoBoleta?: TipoBoleta;
}
