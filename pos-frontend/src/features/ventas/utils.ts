/*
 * MAPA DEL ARCHIVO: LOGICA FRONTEND
 * UBICACION: pos-frontend/src/features/ventas/utils.ts
 * QUE HACE: Funciones puras del modulo, sin renderizar interfaz.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React from 'react';
import { Venta } from '../../types';
import { BoletaConfig } from '../../utils/boletaConfig';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import {
  DEFAULT_BOLETA_SERIE,
  DEFAULT_FACTURA_SERIE,
  IGV_RATE,
  MP_PENDING_SALE_STORAGE_KEY,
  TIPO_COMPROBANTE_BOLETA,
  TIPO_COMPROBANTE_FACTURA
} from './constants';
import { ClienteBoleta, MPPendingSale, TipoBoleta } from './types';

// LOGICA VENTAS: lee de localStorage la venta pendiente de Mercado Pago.
export const readPendingSale = (): MPPendingSale | null => {
  try {
    const raw = globalThis.localStorage.getItem(MP_PENDING_SALE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MPPendingSale) : null;
  } catch {
    return null;
  }
};

// LOGICA VENTAS: Mercado Pago solo acepta back_urls seguras con HTTPS.
export const canUseMercadoPagoBackUrls = (rawBase: string) => {
  try {
    return new URL(rawBase).protocol === 'https:';
  } catch {
    return false;
  }
};

// LOGICA VENTAS: bloquea teclas invalidas en inputs numericos.
export const blockInvalidNumberKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (['-', '+', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
  }
};

// LOGICA VENTAS: normaliza decimales para precios o montos escritos por el usuario.
export const normalizeDecimalInput = (rawValue: string) => {
  const normalized = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = normalized.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  return decimalParts.length > 0 ? `${integerPart}.${decimals}` : integerPart;
};

// LOGICA VENTAS: limita cantidad vendida entre 1 y el stock disponible.
export const clampQuantity = (cantidad: number, stockActual: number) => {
  const maxStock = Math.max(1, Math.floor(Number(stockActual) || 1));
  const parsed = Math.floor(Number(cantidad));
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(parsed, maxStock));
};

// LOGICA VENTAS: convierte el texto del input de cantidad a numero valido.
export const parseQuantityInput = (rawValue: string, stockActual: number) => {
  const digitsOnly = rawValue.replace(/\D/g, '');
  return digitsOnly ? clampQuantity(Number(digitsOnly), stockActual) : 1;
};

// LOGICA VENTAS: formatea un numero a dos decimales para calculos/boleta.
export const formatMoneyNumber = (value: number) => Number(value || 0).toFixed(2);

// LOGICA VENTAS: muestra un monto en formato moneda peruana.
export const formatCurrency = (value: number | undefined | null) => {
  if (typeof value !== 'number' || isNaN(value)) return 'S/ 0.00';
  return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

// LOGICA VENTAS: genera hash corto para referencia/QR de boleta.
export const createReferenceHash = (payload: string) => {
  let hash = 0;
  for (let index = 0; index < payload.length; index += 1) {
    hash = ((hash << 5) - hash + payload.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
};

const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

// LOGICA VENTAS: conversion simple para imprimir montos menores a mil en letras.
const numeroMenorMilALetras = (numero: number): string => {
  if (numero === 0) return '';
  if (numero === 100) return 'CIEN';
  if (numero < 10) return unidades[numero];
  if (numero < 20) return especiales[numero - 10];
  if (numero < 30) return numero === 20 ? 'VEINTE' : `VEINTI${unidades[numero - 20].toLowerCase()}`.toUpperCase();
  if (numero < 100) {
    const unidad = numero % 10;
    return `${decenas[Math.floor(numero / 10)]}${unidad ? ` Y ${unidades[unidad]}` : ''}`;
  }
  const centena = Math.floor(numero / 100);
  const resto = numero % 100;
  return `${centenas[centena]}${resto ? ` ${numeroMenorMilALetras(resto)}` : ''}`;
};

// LOGICA VENTAS: convierte la parte entera del total a letras.
const numeroALetras = (numero: number): string => {
  const entero = Math.floor(Math.max(0, numero));
  if (entero === 0) return 'CERO';
  if (entero < 1000) return numeroMenorMilALetras(entero);
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  const textoMiles = miles === 1 ? 'MIL' : `${numeroMenorMilALetras(miles)} MIL`;
  return `${textoMiles}${resto ? ` ${numeroMenorMilALetras(resto)}` : ''}`;
};

// LOGICA VENTAS: texto final del total en letras para la boleta.
export const montoEnLetras = (total: number) => {
  const entero = Math.floor(total);
  const centimos = Math.round((total - entero) * 100);
  return `SON: ${numeroALetras(entero)} CON ${String(centimos).padStart(2, '0')}/100 SOLES`;
};

// LOGICA VENTAS: obtiene total de venta desde venta.total o lo recalcula con productosVendidos.
export const getVentaTotal = (venta: Venta) => {
  if (typeof venta.total === 'number' && !isNaN(venta.total)) return venta.total;
  return venta.productosVendidos.reduce((sum, item) => {
    const precio = item.producto.precioVenta ?? 0;
    const cantidad = item.cantidad || 1;
    return sum + precio * cantidad;
  }, 0);
};

// LOGICA VENTAS: decide la serie de boleta segun configuracion y tipo.
export const getBoletaSerie = (boletaEmpresa: BoletaConfig, tipo: TipoBoleta) => {
  const rawSerie = (boletaEmpresa.serie || '').trim().toUpperCase().replace(/\s+/g, '');
  if (tipo === 'factura') {
    if (!rawSerie) return DEFAULT_FACTURA_SERIE;
    if (rawSerie.startsWith('F')) return rawSerie;
    const digits = rawSerie.replace(/\D/g, '');
    return digits ? `F${digits.padStart(3, '0').slice(-3)}` : DEFAULT_FACTURA_SERIE;
  }
  if (!rawSerie) return DEFAULT_BOLETA_SERIE;
  if (rawSerie.startsWith('B')) return rawSerie;
  const digits = rawSerie.replace(/\D/g, '');
  return digits ? `B${digits.padStart(3, '0').slice(-3)}` : DEFAULT_BOLETA_SERIE;
};

// LOGICA VENTAS: correlativo visible de boleta con ceros a la izquierda.
export const getBoletaCorrelativo = (venta: Venta) => {
  const raw = venta.numero ?? venta.id ?? 0;
  return String(raw).padStart(6, '0');
};

// LOGICA VENTAS: une serie y correlativo en formato SERIE-NUMERO.
export const formatBoletaSerieNumero = (
  venta: Venta,
  boletaEmpresa: BoletaConfig,
  tipo: TipoBoleta
) => `${getBoletaSerie(boletaEmpresa, tipo)}-${getBoletaCorrelativo(venta)}`;

// LOGICA VENTAS: fecha de boleta en formato YYYY-MM-DD.
export const formatFechaBoleta = (fecha?: string) => {
  if (!fecha) return new Date().toLocaleDateString('en-CA');
  const parsed = new Date(fecha);
  return isNaN(parsed.getTime()) ? new Date().toLocaleDateString('en-CA') : parsed.toLocaleDateString('en-CA');
};

// LOGICA VENTAS: nombre legible del metodo de pago para imprimir boleta.
export const formatMetodoPagoBoleta = (metodo?: string) => {
  if (!metodo) return '-';
  const key = metodo.toLowerCase();
  if (key === 'mercadopago' || key === 'mercadopago_link') return 'Mercado Pago';
  if (key === 'yape') return 'Yape';
  if (key === 'efectivo') return 'Efectivo';
  if (key === 'mixto') return 'Pago mixto';
  return metodo;
};

// LOGICA VENTAS: calcula base imponible, IGV y total de la boleta.
export const getBoletaResumenTributario = (venta: Venta, tipoBoleta: TipoBoleta) => {
  const total = Number(getVentaTotal(venta).toFixed(2));
  const opGravada = Number((total / (1 + IGV_RATE)).toFixed(2));
  const igv = Number((total - opGravada).toFixed(2));
  return { opGravada, igv, opInafecta: 0, opExonerada: 0, isc: 0, total };
};

export const getTipoComprobanteSunat = (tipoBoleta: TipoBoleta) =>
  tipoBoleta === 'factura' ? TIPO_COMPROBANTE_FACTURA : TIPO_COMPROBANTE_BOLETA;

// LOGICA VENTAS: hash que SUNAT usa para validar la representacion impresa con QR.
export const getBoletaHash = (
  venta: Venta,
  boletaEmpresa: BoletaConfig,
  tipoBoleta: TipoBoleta,
  cliente?: ClienteBoleta | null
) => {
  const resumen = getBoletaResumenTributario(venta, tipoBoleta);
  const serie = getBoletaSerie(boletaEmpresa, tipoBoleta);
  const numero = getBoletaCorrelativo(venta);
  const tipoDocCliente = cliente?.tipoDocumento || (tipoBoleta === 'factura' ? '6' : '1');
  const numeroDocCliente = cliente?.numeroDocumento || cliente?.ruc || cliente?.dni || '';
  return createReferenceHash(`${boletaEmpresa.ruc}|${getTipoComprobanteSunat(tipoBoleta)}|${serie}|${numero}|${formatMoneyNumber(resumen.igv)}|${formatMoneyNumber(resumen.total)}|${formatFechaBoleta(venta.fecha)}|${tipoDocCliente}|${numeroDocCliente}`);
};

// LOGICA VENTAS: arma el texto completo que se convierte en QR SUNAT.
export const buildSunatQrPayload = (
  venta: Venta,
  boletaEmpresa: BoletaConfig,
  tipoBoleta: TipoBoleta,
  cliente?: ClienteBoleta | null
) => {
  const resumen = getBoletaResumenTributario(venta, tipoBoleta);
  const serie = getBoletaSerie(boletaEmpresa, tipoBoleta);
  const numero = getBoletaCorrelativo(venta);
  const tipoDocCliente = cliente?.tipoDocumento || (tipoBoleta === 'factura' ? '6' : '1');
  const numeroDocCliente = cliente?.numeroDocumento || cliente?.ruc || cliente?.dni || '-';
  const basePayload = [
    boletaEmpresa.ruc,
    getTipoComprobanteSunat(tipoBoleta),
    serie,
    numero,
    formatMoneyNumber(resumen.igv),
    formatMoneyNumber(resumen.total),
    formatFechaBoleta(venta.fecha),
    tipoDocCliente,
    numeroDocCliente
  ].join('|');
  return `${basePayload}|${createReferenceHash(basePayload)}|`;
};
