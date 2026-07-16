/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND PUBLICA
 * UBICACION: pos-frontend/src/pages/10-ClienteTiendaPage.tsx
 * QUE HACE: Tienda publica para clientes: catalogo, carrito, login Google/perfil y pedidos.
 * GUIA: usa comentarios DISEÑO/LOGICA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import {
  AccountCircle,
  Add,
  Delete,
  Download,
  Email,
  History,
  LocalMall,
  Logout,
  Payment,
  Person,
  ReceiptLong,
  Remove,
  Search,
  Storefront
} from '@mui/icons-material';
import {
  createPedidoOnlineCliente,
  createPublicMercadoPagoPreference,
  cancelarPedidoOnlineCliente,
  getCategorias,
  getClienteActual,
  getMisPedidosCliente,
  getProductos,
  getPublicMercadoPagoPayment,
  loginCliente,
  loginClienteGoogle,
  registerCliente,
  updateClientePerfil
} from '../services/api';
import { Producto, Categoria, Venta } from '../types';
import { useAppConfig } from '../hooks/useAppConfig';
import { loadBoletaConfig } from '../utils/boletaConfig';
import {
  formatFechaBoleta,
  formatMetodoPagoBoleta,
  getBoletaResumenTributario,
  montoEnLetras
} from '../features/ventas/utils';
import PasswordResetDialog from '../components/common/PasswordResetDialog';
import GoogleSignInButton from '../components/common/GoogleSignInButton';

const CLIENT_CART_KEY = 'cliente_tienda_carrito';
const CLIENT_PROFILE_KEY = 'cliente_tienda_perfil';
const CLIENT_ORDERS_KEY = 'cliente_tienda_pedidos';
const CLIENT_TOKEN_KEY = 'cliente_tienda_token';
const CLIENT_PENDING_MP_ORDER_KEY = 'cliente_tienda_mp_pendiente';

type CartItems = Record<number, number>;

type ClientePerfil = {
  nombre: string;
  dni: string;
  email: string;
  telefono: string;
  direccion: string;
  password?: string;
  fotoUrl?: string;
};

type ClientePedido = {
  id: string;
  backendId?: number;
  fecha: string;
  estado: 'PENDIENTE_RECOJO' | 'PENDIENTE_PAGO' | 'PAGADO' | 'RECOGIDO' | 'ANULADO';
  metodoPago: 'RECOJO' | 'MERCADO_PAGO';
  entrega: 'RECOJO_TIENDA';
  clienteEmail: string;
  total: number;
  boletaHtml?: string;
  boletaEnviada?: boolean;
  pagoReferencia?: string;
  cancelacionMotivo?: string;
  reembolsoEstado?: string;
  productos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    precioVenta: number;
    subtotal: number;
  }>;
};

const emptyPerfil: ClientePerfil = {
  nombre: '',
  dni: '',
  email: '',
  telefono: '',
  direccion: ''
};

const readSafeStoredProfile = (): ClientePerfil => {
  const stored = readStorage<ClientePerfil>(CLIENT_PROFILE_KEY, emptyPerfil);
  const safe = { ...stored };
  delete safe.password;
  return safe;
};

// LOGICA CLIENTE - LOCALSTORAGE:
// Lee objetos persistidos del cliente sin afectar token/user del sistema admin/cajero.
const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

// LOGICA CLIENTE - FORMATO DE MONEDA:
// Convierte precios del catalogo a soles para tarjetas, carrito e historial.
const formatCurrency = (value: number | undefined | null) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// LOGICA CLIENTE - IMAGEN:
// Usa imagen del producto si existe; si no, muestra una imagen generica del catalogo.
const getProductImage = (producto: Producto) =>
  producto.imagen || 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png';

// LOGICA CLIENTE - AVATAR:
// Genera una imagen simple basada en nombre/correo para mostrar al cliente en la barra superior.
const buildAvatarUrl = (perfil: ClientePerfil) => {
  const label = encodeURIComponent(perfil.nombre || perfil.email || 'Cliente');
  return `https://ui-avatars.com/api/?name=${label}&background=1976d2&color=fff&bold=true`;
};

// LOGICA CLIENTE - BOLETA HTML:
// Escapa texto antes de armar la boleta para evitar insertar contenido inseguro en el documento generado.
const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMoneyNumber = (value: number) => Number(value || 0).toFixed(2);
const paymentAmountMatches = (expected: number, paid: number) => Math.abs(Number(expected || 0) - Number(paid || 0)) <= 0.01;

// LOGICA CLIENTE - PDF:
// Normaliza texto para escribirlo dentro del PDF generado en el navegador.
const toPdfText = (value: string | number | undefined | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfString = (value: string | number | undefined | null) =>
  toPdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapPdfText = (value: string, maxLength = 34) => {
  const words = toPdfText(value).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= maxLength) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

type PdfLine = {
  text?: string;
  bold?: boolean;
  center?: boolean;
  size?: number;
  label?: string;
  value?: string;
};

const buildPdfFile = (lines: PdfLine[]) => {
  const pageWidth = 226.77;
  const lineHeight = 12;
  const pageHeight = Math.max(420, 44 + lines.length * lineHeight);
  let y = pageHeight - 20;
  const content = lines.map((line) => {
    const fontSize = line.size || 9;
    if (line.label) {
      const x = 12;
      const labelText = `${escapePdfString(line.label)}:`;
      const valueText = escapePdfString(line.value || '');
      const valueX = x + Math.min(72, Math.max(42, labelText.length * fontSize * 0.48));
      const command = [
        `BT /F2 ${fontSize} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${labelText}) Tj ET`,
        `BT /${line.bold ? 'F2' : 'F1'} ${fontSize} Tf ${valueX.toFixed(2)} ${y.toFixed(2)} Td (${valueText}) Tj ET`
      ].join('\n');
      y -= lineHeight;
      return command;
    }

    const lineText = line.text || '';
    const estimatedWidth = escapePdfString(lineText).length * fontSize * 0.5;
    const x = line.center ? Math.max(12, (pageWidth - estimatedWidth) / 2) : 12;
    const command = `BT /${line.bold ? 'F2' : 'F1'} ${fontSize} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfString(lineText)}) Tj ET`;
    y -= lineHeight;
    return command;
  }).join('\n');

  const contentStream = `${content}\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object) => {
    const offset = pdf.length;
    pdf += object;
    return offset;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

const buildBoletaPdfBlob = (pedido: ClientePedido, cliente: ClientePerfil, appName: string) => {
  const boletaEmpresa = loadBoletaConfig();
  const empresaNombre = boletaEmpresa.nombre || appName.toUpperCase();
  const correlativo = pedido.id.replace(/\D/g, '').slice(-6).padStart(6, '0');
  const serieNumero = `B${String(boletaEmpresa.serie || '001').replace(/\D/g, '').padStart(3, '0')}-${correlativo}`;
  const totalItems = pedido.productos.reduce((sum, item) => sum + Math.max(1, item.cantidad || 1), 0);
  const clienteNombre = cliente.nombre || 'PUBLICO GENERAL';
  const clienteDocumento = cliente.dni || '00000000';
  const metodoPago = pedido.metodoPago === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Al recoger';
  const ventaBoleta: Venta = {
    id: Number(correlativo),
    fecha: pedido.fecha,
    total: pedido.total,
    metodoPago,
    productosVendidos: pedido.productos.map((producto) => ({
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        descripcion: '',
        precioVenta: producto.precioVenta,
        stockActual: 0,
        categoriaId: 0
      },
      cantidad: producto.cantidad
    }))
  };
  const resumen = getBoletaResumenTributario(ventaBoleta, 'boleta');
  const separator = '--------------------------------';
  const lines: PdfLine[] = [
    ...wrapPdfText(empresaNombre.toUpperCase(), 26).map((text) => ({ text, bold: true, center: true, size: 12 })),
    { text: `RUC: ${boletaEmpresa.ruc || '-'}`, center: true },
    ...wrapPdfText((boletaEmpresa.direccion || '-').toUpperCase(), 30).map((text) => ({ text, center: true })),
    { text: `Tel: ${boletaEmpresa.telefono || '-'}`, center: true },
    { text: separator, center: true },
    { text: 'BOLETA DE VENTA ELECTRONICA', bold: true, center: true, size: 11 },
    { text: serieNumero, bold: true, center: true, size: 11 },
    { text: 'Control interno', center: true },
    { text: separator, center: true },
    { label: 'Fecha', value: new Date(pedido.fecha).toLocaleDateString('es-PE') },
    { label: 'Cliente', value: clienteNombre },
    { label: 'Doc.', value: clienteDocumento },
    { label: 'Pago', value: metodoPago },
    { label: 'Pedido', value: pedido.id },
    { label: 'Moneda', value: 'SOL' },
    { text: separator, center: true },
    { text: 'DETALLES DE LA BOLETA', bold: true, size: 10 }
  ];

  pedido.productos.forEach((item) => {
    wrapPdfText(item.nombre.toUpperCase(), 34).forEach((text) => lines.push({ text, bold: true }));
    lines.push({ label: 'Cantidad', value: String(item.cantidad) });
    lines.push({ label: 'Precio unit.', value: `S/ ${formatMoneyNumber(item.precioVenta)}` });
    lines.push({ label: 'Subtotal', value: `S/ ${formatMoneyNumber(item.subtotal)}` });
  });

  lines.push(
    { text: separator, center: true },
    { label: 'Items', value: String(totalItems) },
    { label: 'Op. Gravada', value: formatCurrency(resumen.opGravada) },
    { label: 'IGV (18%)', value: formatCurrency(resumen.igv) },
    { label: 'TOTAL', value: formatCurrency(resumen.total), bold: true, size: 12 },
    { text: separator, center: true },
    ...wrapPdfText(`SON: ${montoEnLetras(pedido.total).toUpperCase()}`, 34).map((text) => ({ text, bold: true })),
    { text: separator, center: true },
    { text: 'Representacion impresa de boleta electronica', center: true },
    { text: 'Gracias por su compra', center: true }
  );

  return buildPdfFile(lines);
};

// LOGICA CLIENTE - ERRORES DE PEDIDO:
// Traduce errores tecnicos del backend a mensajes claros para saber si falta reiniciar servidor o si fallo el stock.
const getPedidoOnlineErrorMessage = (error: any) => {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message;
  if (backendMessage) return backendMessage;
  if (status === 404) {
    return 'El backend aun no tiene cargada la ruta de pedidos online. Reinicia pos-backend y vuelve a intentar.';
  }
  if (!error?.response) {
    return 'No hay conexion con el backend. Verifica que pos-backend este iniciado.';
  }
  return 'No se pudo registrar el pedido. Revisa stock o conexion con backend.';
};

// LOGICA CLIENTE - BOLETA:
// Construye una boleta imprimible en formato amplio tipo SUNAT para pedidos online.
const buildBoletaHtml = (pedido: ClientePedido, cliente: ClientePerfil, appName: string) => {
  const boletaEmpresa = loadBoletaConfig();
  const empresaNombre = boletaEmpresa.nombre || appName.toUpperCase();
  const correlativo = pedido.id.replace(/\D/g, '').slice(-6).padStart(6, '0');
  const serieNumero = `B${String(boletaEmpresa.serie || '001').replace(/\D/g, '').padStart(3, '0')}-${correlativo}`;
  const totalItems = pedido.productos.reduce((sum, item) => sum + Math.max(1, item.cantidad || 1), 0);
  const clienteNombre = cliente.nombre || 'PUBLICO GENERAL';
  const clienteDocumento = cliente.dni || '00000000';
  const metodoPago = pedido.metodoPago === 'MERCADO_PAGO' ? 'mercadopago' : 'Al recoger';
  const ventaBoleta: Venta = {
    id: Number(correlativo),
    fecha: pedido.fecha,
    total: pedido.total,
    metodoPago,
    productosVendidos: pedido.productos.map((producto) => ({
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        descripcion: '',
        precioVenta: producto.precioVenta,
        stockActual: 0,
        categoriaId: 0
      },
      cantidad: producto.cantidad
    }))
  };
  const resumen = getBoletaResumenTributario(ventaBoleta, 'boleta');
  const rows = pedido.productos.map((item) => `
    <tr>
      <td class="center">${escapeHtml(item.cantidad)}</td>
      <td>NIU</td>
      <td>PROD-${String(item.id).padStart(3, '0')}</td>
      <td>${escapeHtml(item.nombre)}</td>
      <td class="num">${formatMoneyNumber(item.precioVenta)}</td>
      <td class="num strong">${formatMoneyNumber(item.subtotal)}</td>
    </tr>
  `).join('');

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Boleta de venta electronica ${escapeHtml(serieNumero)}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .boleta {
            width: 100%;
            max-width: 560px;
            margin: 0 auto;
            padding: 14px;
            border: 1px solid #cfcfcf;
            background: #fff;
          }
          .top {
            display: grid;
            grid-template-columns: 1fr 160px;
            gap: 14px;
            align-items: start;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 20px;
            line-height: 1.08;
            font-weight: 900;
            text-transform: uppercase;
          }
          .company {
            font-size: 11px;
            line-height: 1.22;
          }
          .docbox {
            border: 1.5px solid #111;
            text-align: center;
            padding: 10px 8px;
            font-size: 10px;
            line-height: 1.2;
          }
          .docbox strong {
            display: block;
            font-size: 12px;
            text-transform: uppercase;
          }
          .serie {
            display: block;
            margin-top: 4px;
            font-size: 13px;
            font-weight: 800;
          }
          .meta {
            margin-top: 14px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 8px 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            row-gap: 5px;
            column-gap: 14px;
            font-size: 11px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            font-size: 10px;
          }
          thead th {
            background: #000;
            color: #fff;
            padding: 5px 4px;
            font-size: 10px;
            text-align: left;
          }
          tbody td {
            border-bottom: 1px solid #ddd;
            padding: 5px 4px;
            vertical-align: top;
          }
          .center { text-align: center; }
          .num { text-align: right; }
          .strong { font-weight: 700; }
          .summary {
            margin-top: 12px;
            display: flex;
            justify-content: flex-end;
            font-size: 12px;
          }
          .summary-box { width: 220px; }
          .items-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 12px;
          }
          .total-box {
            display: flex;
            justify-content: space-between;
            background: #000;
            color: #fff;
            padding: 6px;
            font-weight: 900;
            font-size: 13px;
          }
          .words {
            margin-top: 12px;
            border: 1px solid #333;
            padding: 6px;
            font-size: 10px;
            font-weight: 800;
          }
          .tax {
            margin-top: 8px;
            text-align: right;
            color: #444;
            font-size: 9.5px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            line-height: 1.25;
          }
          @media print {
            body { padding: 0; }
            .boleta { border: none; max-width: 560px; }
          }
        </style>
      </head>
      <body>
        <main id="boleta-print" class="boleta">
          <section class="top">
            <div>
              <h1>${escapeHtml(empresaNombre)}</h1>
              <div class="company">
                <div>RUC: ${escapeHtml(boletaEmpresa.ruc || '-')}</div>
                <div>${escapeHtml(boletaEmpresa.direccion || '-')}</div>
                <div>Tel: ${escapeHtml(boletaEmpresa.telefono || '-')}</div>
              </div>
            </div>
            <div class="docbox">
              <div>RUC: ${escapeHtml(boletaEmpresa.ruc || '-')}</div>
              <strong>Boleta de venta electronica</strong>
              <span class="serie">${escapeHtml(serieNumero)}</span>
            </div>
          </section>

          <section class="meta">
            <div><strong>Fecha:</strong> ${formatFechaBoleta(pedido.fecha)}</div>
            <div><strong>Pago:</strong> ${escapeHtml(formatMetodoPagoBoleta(metodoPago))}</div>
            <div><strong>Cliente:</strong> ${escapeHtml(clienteNombre)}</div>
            <div><strong>DNI:</strong> ${escapeHtml(clienteDocumento)}</div>
            <div><strong>Pedido:</strong> ${escapeHtml(pedido.id)}</div>
            <div><strong>Moneda:</strong> SOL</div>
          </section>

          <table>
            <thead>
              <tr>
                <th colspan="6">DETALLES DE LA BOLETA</th>
              </tr>
              <tr>
                <th style="width:9%;text-align:center">Cant.</th>
                <th style="width:10%;text-align:center">Unid.</th>
                <th style="width:18%;text-align:center">Codigo</th>
                <th>Descripcion</th>
                <th style="width:14%;text-align:right">P. Unit.</th>
                <th style="width:14%;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <section class="summary">
            <div class="summary-box">
              <div class="items-line"><span>Items:</span><strong>${totalItems}</strong></div>
              <div class="total-box"><span>IMPORTE TOTAL:</span><span>${formatCurrency(resumen.total)}</span></div>
            </div>
          </section>

          <section class="words">SON: ${montoEnLetras(pedido.total).toUpperCase()}</section>
          <section class="tax">
            Op. Gravada: ${formatCurrency(resumen.opGravada)} | IGV (18%): ${formatCurrency(resumen.igv)}
          </section>

          <section class="footer">
            <div>Representacion impresa de boleta electronica</div>
            <div>Gracias por su compra</div>
          </section>
        </main>
      </body>
    </html>
  `;
};

const ClienteTiendaPage: React.FC = () => {
  const config = useAppConfig();

  // LOGICA CLIENTE - ESTADOS PRINCIPALES:
  // Manejan catalogo, busqueda, carrito, perfil, checkout, historial y mensajes.
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(0);
  const [cartItems, setCartItems] = useState<CartItems>(() => readStorage<CartItems>(CLIENT_CART_KEY, {}));
  const [perfil, setPerfil] = useState<ClientePerfil>(readSafeStoredProfile);
  const [perfilForm, setPerfilForm] = useState<ClientePerfil>(readSafeStoredProfile);
  const [pedidos, setPedidos] = useState<ClientePedido[]>(() => readStorage<ClientePedido[]>(CLIENT_ORDERS_KEY, []));
  const [authOpen, setAuthOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'register'>('login');
  const [checkoutAfterAuth, setCheckoutAfterAuth] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [clienteToken, setClienteToken] = useState(() => localStorage.getItem(CLIENT_TOKEN_KEY) || '');
  const [resetOpen, setResetOpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'RECOJO' | 'MERCADO_PAGO'>('RECOJO');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [paying, setPaying] = useState(false);

  const isClienteRegistrado = Boolean(perfil.email && perfil.nombre);
  const clientePedidos = useMemo(
    () => pedidos.filter((pedido) => !perfil.email || pedido.clienteEmail === perfil.email),
    [pedidos, perfil.email]
  );

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  useEffect(() => {
    localStorage.removeItem('cliente_tienda_cuentas');
  }, []); // migración única: elimina contraseñas que versiones antiguas guardaban en el navegador

  useEffect(() => {
    if (!clienteToken) return;
    getClienteActual(clienteToken)
      .then((cliente) => {
        const safePerfil = { ...cliente, fotoUrl: buildAvatarUrl(cliente) };
        setPerfil(safePerfil);
        setPerfilForm(safePerfil);
      })
      .catch(() => {
        localStorage.removeItem(CLIENT_TOKEN_KEY);
        setClienteToken('');
        setPerfil(emptyPerfil);
        setPerfilForm(emptyPerfil);
      });
  }, [clienteToken]);

  // LOGICA CLIENTE - CUENTAS LOCALES:
  // Guarda cuentas de clientes por correo para probar usuario/contraseña sin afectar usuarios admin/cajero.
  const finishAuthFlow = (nextPerfil: ClientePerfil) => {
    setPerfil(nextPerfil);
    setPerfilForm(nextPerfil);
    setAuthOpen(false);
    if (checkoutAfterAuth) {
      setCheckoutOpen(true);
      setCheckoutAfterAuth(false);
    }
  };

  const loginClienteSeguro = async () => {
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;
    try {
      const result = await loginCliente(email, password);
      localStorage.setItem(CLIENT_TOKEN_KEY, result.token);
      setClienteToken(result.token);
      finishAuthFlow({ ...result.cliente, password: undefined });
      setLoginPassword('');
      showSnackbar('Sesión de cliente iniciada.');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'Correo o contraseña incorrectos.', 'error');
    }
  };

  const openAuthDialog = (mode: 'login' | 'register', shouldContinueCheckout = false) => {
    setAuthStep(mode);
    setCheckoutAfterAuth(shouldContinueCheckout);
    setAuthOpen(true);
  };

  // SERVICIO CLIENTE - CATALOGO EN TIEMPO REAL:
  // Carga productos/categorias y vuelve a consultar cada 5 segundos para reflejar cambios sin recargar la pagina.
  const loadCatalogo = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [productosData, categoriasData] = await Promise.all([
        getProductos(null),
        getCategorias(null)
      ]);
      setProductos(Array.isArray(productosData) ? productosData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    } catch {
      if (!silent) {
        setProductos([]);
        setCategorias([]);
        showSnackbar('No se pudo cargar el catalogo de productos.', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    void loadCatalogo();
    const intervalId = window.setInterval(() => {
      void loadCatalogo(true);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loadCatalogo]);

  // LOGICA CLIENTE - PERSISTENCIA:
  // Mantiene carrito, perfil e historial si el cliente cierra y vuelve a abrir el navegador.
  useEffect(() => {
    localStorage.setItem(CLIENT_CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(CLIENT_PROFILE_KEY, JSON.stringify(perfil));
  }, [perfil]);

  useEffect(() => {
    localStorage.setItem(CLIENT_ORDERS_KEY, JSON.stringify(pedidos));
  }, [pedidos]);

  // SERVICIO CLIENTE - ESTADO DEL PEDIDO:
  // Consulta MySQL por correo para que el cliente vea si su pedido sigue pendiente o ya fue recogido.
  useEffect(() => {
    if (!perfil.email || !clienteToken) return undefined;

    const syncPedidosCliente = async () => {
      try {
        const pedidosBackend = await getMisPedidosCliente(clienteToken);
        if (!Array.isArray(pedidosBackend)) return;

        setPedidos((prev) => {
          const byCodigo = new Map(prev.map((pedido) => [pedido.id, pedido]));
          pedidosBackend.forEach((pedidoBackend) => {
            byCodigo.set(pedidoBackend.codigo, {
              id: pedidoBackend.codigo,
              backendId: pedidoBackend.id,
              fecha: pedidoBackend.fecha,
              estado: pedidoBackend.estado,
              metodoPago: pedidoBackend.metodoPago,
              entrega: pedidoBackend.entrega,
              clienteEmail: pedidoBackend.cliente.email,
              total: pedidoBackend.total,
              boletaHtml: pedidoBackend.boletaHtml,
              boletaEnviada: Boolean(pedidoBackend.cliente.email),
              cancelacionMotivo: pedidoBackend.cancelacionMotivo,
              reembolsoEstado: pedidoBackend.reembolsoEstado,
              productos: pedidoBackend.productos
            });
          });
          return Array.from(byCodigo.values()).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        });
      } catch {
        // El historial local se mantiene si el backend no responde.
      }
    };

    void syncPedidosCliente();
    const intervalId = window.setInterval(syncPedidosCliente, 10000);
    return () => window.clearInterval(intervalId);
  }, [perfil.email, clienteToken]);

  const handleClienteGoogleCredential = useCallback(async (credential: string) => {
    try {
      const result = await loginClienteGoogle(credential);
      localStorage.setItem(CLIENT_TOKEN_KEY, result.token);
      setClienteToken(result.token);
      const nextPerfil = { ...result.cliente, password: undefined, fotoUrl: buildAvatarUrl(result.cliente) };
      setPerfil(nextPerfil);
      setPerfilForm(nextPerfil);
      setAuthOpen(false);
      if (!result.cliente.dni || !result.cliente.telefono) {
        setCheckoutAfterAuth(false);
        setPerfilOpen(true);
        showSnackbar('Acceso con Google correcto. Completa DNI y telefono para comprar.');
      } else if (checkoutAfterAuth) {
        setCheckoutOpen(true);
        setCheckoutAfterAuth(false);
      }
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo iniciar sesion con Google.', 'error');
    }
  }, [checkoutAfterAuth, showSnackbar]);

  // LOGICA CLIENTE - FILTRO:
  // Busca productos por nombre o descripcion dentro del catalogo publico.
  const productosVisibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return productos.filter((producto) => {
      const disponible = producto.activo !== false && Number(producto.stockActual || 0) > 0;
      if (!disponible) return false;
      if (producto.fechaVencimiento && new Date(`${producto.fechaVencimiento}T00:00:00`).getTime() < today.getTime()) return false;
      if (categoriaFiltro !== 0 && producto.categoriaId !== categoriaFiltro) return false;
      if (!query) return true;
      return `${producto.nombre} ${producto.descripcion || ''}`.toLowerCase().includes(query);
    });
  }, [busqueda, categoriaFiltro, productos]);

  const categoriaNombrePorId = useMemo(() => categorias.reduce<Record<number, string>>((acc, categoria) => {
    acc[categoria.id] = categoria.nombre;
    return acc;
  }, {}), [categorias]);

  // LOGICA CLIENTE - CARRITO:
  // Convierte el mapa productoId/cantidad en filas con subtotal y valida stock actual.
  const cartRows = useMemo(() => {
    return Object.entries(cartItems)
      .map(([productoId, cantidad]) => {
        const producto = productos.find((item) => item.id === Number(productoId));
        if (!producto) return null;
        const stock = Number(producto.stockActual || 0);
        const safeCantidad = Math.min(Number(cantidad || 0), stock);
        return {
          producto,
          cantidad: safeCantidad,
          subtotal: safeCantidad * Number(producto.precioVenta || 0)
        };
      })
      .filter((item): item is { producto: Producto; cantidad: number; subtotal: number } => Boolean(item && item.cantidad > 0));
  }, [cartItems, productos]);

  const cartTotal = useMemo(() => cartRows.reduce((sum, item) => sum + item.subtotal, 0), [cartRows]);
  const cartCount = useMemo(() => cartRows.reduce((sum, item) => sum + item.cantidad, 0), [cartRows]);
  const perfilStats = useMemo(() => {
    const estadosActivos = new Set<ClientePedido['estado']>(['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO']);
    const estadosCobrados = new Set<ClientePedido['estado']>(['PAGADO', 'RECOGIDO']);
    const activos = clientePedidos.filter((pedido) => estadosActivos.has(pedido.estado)).length;
    const entregados = clientePedidos.filter((pedido) => pedido.estado === 'RECOGIDO').length;
    const totalGastado = clientePedidos
      .filter((pedido) => estadosCobrados.has(pedido.estado))
      .reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
    return {
      totalPedidos: clientePedidos.length,
      activos,
      entregados,
      totalGastado,
      ultimoPedido: clientePedidos[0]
    };
  }, [clientePedidos]);

  const updateCartQuantity = (producto: Producto, nextCantidad: number) => {
    const stock = Number(producto.stockActual || 0);
    if (stock <= 0) {
      showSnackbar('Producto sin stock disponible.', 'error');
      return;
    }
    if (nextCantidad > stock) {
      showSnackbar(`Solo hay ${stock} unidad(es) disponibles.`, 'error');
      return;
    }

    setCartItems((prev) => {
      const updated = { ...prev };
      if (nextCantidad <= 0) {
        delete updated[producto.id];
      } else {
        updated[producto.id] = nextCantidad;
      }
      return updated;
    });
  };

  const addToCart = (producto: Producto) => {
    const current = cartItems[producto.id] || 0;
    updateCartQuantity(producto, current + 1);
  };

  const validatePerfil = () => {
    if (!perfilForm.nombre.trim() || !perfilForm.dni.trim() || !perfilForm.email.trim() || !perfilForm.telefono.trim()) {
      showSnackbar('Nombre, DNI, correo y teléfono son obligatorios.', 'error');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(perfilForm.email.trim())) {
      showSnackbar('Ingrese un correo válido.', 'error');
      return false;
    }
    if (!clienteToken && !perfilForm.password?.trim()) {
      showSnackbar('La contraseña es obligatoria para crear la cuenta.', 'error');
      return false;
    }
    if (!/^\d{8}$/.test(perfilForm.dni.trim())) {
      showSnackbar('El DNI debe tener 8 dígitos.', 'error');
      return false;
    }
    if (!/^\d{9}$/.test(perfilForm.telefono.trim())) {
      showSnackbar('El telefono debe tener 9 digitos.', 'error');
      return false;
    }
    return true;
  };

  const savePerfil = async () => {
    if (!validatePerfil()) return false;
    const limpio = {
      ...perfilForm,
      nombre: perfilForm.nombre.trim(),
      dni: perfilForm.dni.trim(),
      email: perfilForm.email.trim(),
      telefono: perfilForm.telefono.replace(/\D/g, '').slice(0, 9),
      direccion: perfilForm.direccion.trim(),
      password: perfilForm.password,
      fotoUrl: perfilForm.fotoUrl || buildAvatarUrl(perfilForm)
    };
    try {
      if (!clienteToken) {
        const result = await registerCliente(limpio);
        localStorage.setItem(CLIENT_TOKEN_KEY, result.token);
        setClienteToken(result.token);
        finishAuthFlow({ ...result.cliente, password: undefined, fotoUrl: limpio.fotoUrl });
        showSnackbar('Cuenta creada correctamente.');
      } else {
        const updated = await updateClientePerfil(limpio, clienteToken);
        finishAuthFlow({ ...updated, password: undefined, fotoUrl: limpio.fotoUrl });
        setPerfilOpen(false);
        showSnackbar('Perfil actualizado exitosamente.');
      }
      return true;
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo guardar la cuenta.', 'error');
      return false;
    }
  };

  // LOGICA CLIENTE - CIERRE DE SESION:
  // Limpia solo la sesion activa del cliente; conserva cuentas, carrito e historial local.
  const logoutCliente = () => {
    setPerfil(emptyPerfil);
    setPerfilForm(emptyPerfil);
    setLoginEmail('');
    setLoginPassword('');
    setPerfilOpen(false);
    setHistorialOpen(false);
    setCheckoutOpen(false);
    localStorage.removeItem(CLIENT_PROFILE_KEY);
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    setClienteToken('');
    showSnackbar('Sesion de cliente cerrada.');
  };

  // LOGICA CLIENTE - BOLETA:
  // Abre la boleta generada para revisar/imprimir desde el historial o despues del pedido.
  const openBoleta = (pedido: ClientePedido) => {
    if (!pedido.productos.length) {
      showSnackbar('Este pedido aun no tiene boleta generada.', 'error');
      return;
    }

    const html = buildBoletaHtml(pedido, perfil, config.appName);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const boletaWindow = window.open(url, '_blank');
    if (!boletaWindow) {
      URL.revokeObjectURL(url);
      showSnackbar('Permite ventanas emergentes para ver la boleta.', 'error');
      return;
    }
  };

  // LOGICA CLIENTE - DESCARGA DE BOLETA:
  // Descarga el comprobante como PDF desde el perfil/historial del cliente.
  const downloadBoleta = (pedido: ClientePedido) => {
    if (!pedido.productos.length) {
      showSnackbar('Este pedido aun no tiene boleta para descargar.', 'error');
      return;
    }

    const blob = buildBoletaPdfBlob(pedido, perfil, config.appName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante-${pedido.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showSnackbar('Comprobante PDF descargado.');
  };

  const openCheckout = () => {
    if (cartRows.length === 0) {
      showSnackbar('Agrega productos al carrito antes de continuar.', 'error');
      return;
    }
    if (!isClienteRegistrado || !clienteToken) {
      openAuthDialog('login', true);
      return;
    }
    setCheckoutOpen(true);
  };

  const buildPedido = (estado: ClientePedido['estado'], metodo: ClientePedido['metodoPago']): ClientePedido => ({
    id: `WEB-${Date.now()}`,
    fecha: new Date().toISOString(),
    estado,
    metodoPago: metodo,
    entrega: 'RECOJO_TIENDA',
    clienteEmail: perfil.email || perfilForm.email,
    total: cartTotal,
    productos: cartRows.map(({ producto, cantidad, subtotal }) => ({
      id: producto.id,
      nombre: producto.nombre,
      cantidad,
      precioVenta: Number(producto.precioVenta || 0),
      subtotal
    }))
  });

  // SERVICIO CLIENTE - REGISTRO DE PEDIDO:
  // Envia la compra al backend para que aparezca en el panel interno de admin/cajero.
  const finishLocalOrder = useCallback(async (pedido: ClientePedido) => {
    const clienteActual = perfil.email ? perfil : perfilForm;
    const pedidoConBoleta: ClientePedido = {
      ...pedido,
      boletaHtml: buildBoletaHtml(pedido, clienteActual, config.appName),
      boletaEnviada: Boolean(clienteActual.email)
    };

    if (!clienteToken) throw new Error('Inicia sesión para registrar el pedido.');
    const pedidoBackend = await createPedidoOnlineCliente({
      codigo: pedidoConBoleta.id,
      estado: pedidoConBoleta.estado,
      metodoPago: pedidoConBoleta.metodoPago,
      entrega: pedidoConBoleta.entrega,
      cliente: {
        nombre: clienteActual.nombre,
        dni: clienteActual.dni,
        email: clienteActual.email,
        telefono: clienteActual.telefono,
        direccion: clienteActual.direccion
      },
      total: pedidoConBoleta.total,
      boletaHtml: pedidoConBoleta.boletaHtml,
      pagoReferencia: pedidoConBoleta.pagoReferencia,
      productos: pedidoConBoleta.productos
    }, clienteToken);

    setPedidos((prev) => [{ ...pedidoConBoleta, backendId: pedidoBackend.id }, ...prev]);
    setCartItems({});
    setCheckoutOpen(false);
    showSnackbar(`Pedido registrado. Boleta generada y enviada a ${clienteActual.email}.`);
  }, [clienteToken, config.appName, perfil, perfilForm, showSnackbar]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = (params.get('status') || params.get('collection_status') || '').toLowerCase();
    const paymentId = params.get('payment_id') || params.get('collection_id') || '';
    const hasMercadoPagoReturn = Boolean(status || paymentId || params.get('merchant_order_id'));
    if (!hasMercadoPagoReturn || !clienteToken) return;

    const rawPending = localStorage.getItem(CLIENT_PENDING_MP_ORDER_KEY);
    if (!rawPending) return;

    try {
      const pending = JSON.parse(rawPending) as ClientePedido;
      if (['approved', 'accredited'].includes(status)) {
        if (!paymentId) {
          localStorage.removeItem(CLIENT_PENDING_MP_ORDER_KEY);
          window.history.replaceState({}, document.title, window.location.pathname);
          showSnackbar('Mercado Pago no devolvio una referencia de pago valida. No se registro el pedido.', 'error');
          return;
        }
        void (async () => {
          try {
            const pago = await getPublicMercadoPagoPayment(paymentId);
            if (pago.status !== 'approved') {
              localStorage.removeItem(CLIENT_PENDING_MP_ORDER_KEY);
              showSnackbar(`Mercado Pago no confirmo el cobro. Estado: ${pago.status}. No se registro el pedido.`, 'error');
              return;
            }
            if (pago.transaction_amount !== undefined && !paymentAmountMatches(pending.total, Number(pago.transaction_amount))) {
              localStorage.removeItem(CLIENT_PENDING_MP_ORDER_KEY);
              showSnackbar('El monto pagado no coincide con el total del pedido. No se registro el pedido.', 'error');
              return;
            }
            await finishLocalOrder({
              ...pending,
              estado: 'PAGADO',
              metodoPago: 'MERCADO_PAGO',
              pagoReferencia: paymentId
            });
            localStorage.removeItem(CLIENT_PENDING_MP_ORDER_KEY);
            showSnackbar('Pago confirmado. Tu pedido fue registrado correctamente.');
          } catch (error: any) {
            showSnackbar(error?.response?.data?.message || 'No se pudo validar el pago con Mercado Pago. No se registro el pedido.', 'error');
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })();
      } else if (['rejected', 'cancelled', 'failure'].includes(status)) {
        localStorage.removeItem(CLIENT_PENDING_MP_ORDER_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);
        showSnackbar('El pago no fue completado. No se genero ningun pedido.', 'error');
      }
    } catch {
      localStorage.removeItem(CLIENT_PENDING_MP_ORDER_KEY);
    }
  }, [clienteToken, finishLocalOrder, showSnackbar]);

  const canCancelPedido = (pedido: ClientePedido) => (
    Boolean(pedido.backendId) && !['ANULADO', 'RECOGIDO'].includes(pedido.estado)
  );

  const handleCancelarPedido = async (pedido: ClientePedido) => {
    if (!clienteToken || !pedido.backendId) {
      showSnackbar('Actualiza tus pedidos antes de cancelar.', 'error');
      return;
    }
    const ok = window.confirm(`Cancelar pedido ${pedido.id}? Se devolvera el stock al sistema.`);
    if (!ok) return;

    try {
      const actualizado = await cancelarPedidoOnlineCliente(pedido.backendId, 'Cancelado por el cliente', clienteToken);
      setPedidos((prev) => prev.map((item) => (
        item.id === pedido.id
          ? {
              ...item,
              estado: actualizado.estado,
              cancelacionMotivo: actualizado.cancelacionMotivo,
              reembolsoEstado: actualizado.reembolsoEstado
            }
          : item
      )));
      const reembolsoMsg = actualizado.reembolsoEstado === 'PENDIENTE_MANUAL'
        ? ' Reembolso Mercado Pago pendiente de revision manual.'
        : '';
      showSnackbar(`Pedido cancelado.${reembolsoMsg}`);
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo cancelar el pedido.', 'error');
    }
  };

  const confirmOrder = async () => {
    if (cartRows.length === 0) {
      showSnackbar('El carrito esta vacio.', 'error');
      return;
    }

    try {
      setPaying(true);
      if (metodoPago === 'RECOJO') {
        await finishLocalOrder(buildPedido('PENDIENTE_RECOJO', 'RECOJO'));
        return;
      }

      const pedido = buildPedido('PENDIENTE_PAGO', 'MERCADO_PAGO');
      const currentUrl = window.location.origin + '/cliente';
      const preference = await createPublicMercadoPagoPreference({
        items: cartRows.map(({ producto, cantidad }) => ({
          title: producto.nombre,
          quantity: cantidad,
          unit_price: Number(producto.precioVenta || 0)
        })),
        backUrls: {
          success: currentUrl,
          failure: currentUrl,
          pending: currentUrl
        },
        externalReference: pedido.id,
        metadata: {
          clienteEmail: perfilForm.email,
          entrega: 'RECOJO_TIENDA',
          origen: 'tienda_publica'
        }
      });

      localStorage.setItem(CLIENT_PENDING_MP_ORDER_KEY, JSON.stringify(pedido));
      window.location.href = preference.init_point || preference.sandbox_init_point || window.location.href;
    } catch (error: any) {
      showSnackbar(getPedidoOnlineErrorMessage(error), 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8fb' }}>
      {/* DISEÑO CLIENTE - BARRA SUPERIOR:
          Entrada publica al catalogo sin cambiar el header privado del dashboard. */}
      <AppBar position="sticky" color="primary" elevation={2} sx={{ zIndex: 1201 }}>
        <Toolbar sx={{ gap: { xs: 0.75, sm: 1.5 }, minHeight: { xs: 56, sm: 64 } }}>
          <Storefront />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {config.appName}
          </Typography>
          {isClienteRegistrado ? (
            <>
              <Button color="inherit" startIcon={<Avatar src={perfil.fotoUrl || buildAvatarUrl(perfil)} sx={{ width: 24, height: 24 }} />} onClick={() => setPerfilOpen(true)} sx={{ minWidth: { xs: 40, sm: 64 }, px: { xs: 0.75, sm: 1.5 } }}>
                {perfil.nombre.split(' ')[0]}
              </Button>
              <Button color="inherit" startIcon={<History />} onClick={() => setHistorialOpen(true)} sx={{ minWidth: { xs: 40, sm: 64 }, px: { xs: 0.75, sm: 1.5 } }}>
                Historial
              </Button>
              <Button color="inherit" startIcon={<Logout />} onClick={logoutCliente} sx={{ minWidth: { xs: 40, sm: 64 }, px: { xs: 0.75, sm: 1.5 } }}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" onClick={() => openAuthDialog('register')} sx={{ minWidth: { xs: 40, sm: 64 }, px: { xs: 0.75, sm: 1.5 } }}>
                Registrarse
              </Button>
              <Button color="inherit" startIcon={<Person />} onClick={() => openAuthDialog('login')} sx={{ minWidth: { xs: 40, sm: 64 }, px: { xs: 0.75, sm: 1.5 } }}>
                Iniciar sesión
              </Button>
            </>
          )}
          <Badge badgeContent={cartCount} color="warning">
            <LocalMall />
          </Badge>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
        {perfilOpen ? (
          <>
            {/* DISEÑO CLIENTE - PERFIL COMO SECCION:
                Reemplaza el modal por una vista completa para que no tape el catalogo ni se vea encima. */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} mb={2}>
              <Box>
                <Typography variant="h3" component="h1" fontWeight={900} sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
                  Perfil del cliente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestiona tus datos, revisa tu actividad y consulta tus boletas.
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<Storefront />} onClick={() => setPerfilOpen(false)}>
                Volver al catalogo
              </Button>
            </Stack>

            <Stack spacing={2.5}>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Avatar src={perfilForm.fotoUrl || buildAvatarUrl(perfilForm)} sx={{ width: 64, height: 64, bgcolor: '#e3f2fd', color: '#0d47a1', fontWeight: 900 }}>
                    {(perfilForm.nombre || perfilForm.email || 'C').slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h5" fontWeight={900} noWrap>{perfilForm.nombre || 'Cliente'}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{perfilForm.email || 'Correo pendiente'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {perfilStats.activos > 0 ? `${perfilStats.activos} pedido(s) pendiente(s)` : 'Sin pedidos en curso'}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button variant="contained" startIcon={<Storefront />} onClick={() => setPerfilOpen(false)} fullWidth>
                      Seguir comprando
                    </Button>
                    <Button variant="outlined" startIcon={<LocalMall />} onClick={openCheckout} fullWidth>
                      Ir al carrito ({cartCount})
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<Logout />} onClick={logoutCliente} fullWidth>
                      Cerrar sesión
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Grid container spacing={2}>
                {[
                  { label: 'Pedidos', value: perfilStats.totalPedidos, hint: 'Total registrados' },
                  { label: 'Activos', value: perfilStats.activos, hint: 'Pendientes o en proceso' },
                  { label: 'Entregados', value: perfilStats.entregados, hint: 'Pedidos completados' },
                  { label: 'Total gastado', value: formatCurrency(perfilStats.totalGastado), hint: 'Historico acumulado' }
                ].map((item) => (
                  <Grid item xs={12} sm={6} md={3} key={item.label}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                      <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                      <Typography variant="h4" fontWeight={900}>{item.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.hint}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {/* DISEÑO CLIENTE - FORMULARIO PERFIL:
                      Campos editables del cliente para comprar mas rapido y mantener datos actualizados. */}
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="overline" color="text.secondary">Ajustes personales</Typography>
                    <Typography variant="h6" fontWeight={900} gutterBottom>Tu cuenta</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Mantén tus datos listos para generar pedidos, boleta y contacto de recojo.
                    </Typography>
                    <Stack spacing={2}>
                      <TextField label="Correo" type="email" value={perfilForm.email} onChange={(e) => setPerfilForm((prev) => ({ ...prev, email: e.target.value.trim().toLowerCase() }))} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }} />
                      <TextField label="Nombre completo" value={perfilForm.nombre} onChange={(e) => setPerfilForm((prev) => ({ ...prev, nombre: e.target.value }))} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }} />
                      <TextField label="DNI" value={perfilForm.dni} onChange={(e) => setPerfilForm((prev) => ({ ...prev, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))} fullWidth inputProps={{ maxLength: 8, inputMode: 'numeric' }} />
                      <TextField label="Telefono" value={perfilForm.telefono} onChange={(e) => setPerfilForm((prev) => ({ ...prev, telefono: e.target.value.replace(/\D/g, '').slice(0, 9) }))} fullWidth inputProps={{ maxLength: 9, inputMode: 'numeric' }} helperText="Debe tener 9 digitos" />
                      <TextField label="Direccion referencial" value={perfilForm.direccion} onChange={(e) => setPerfilForm((prev) => ({ ...prev, direccion: e.target.value }))} fullWidth multiline minRows={2} />
                      <Button variant="contained" startIcon={<AccountCircle />} onClick={savePerfil} size="large">
                        Guardar cambios
                      </Button>
                      <Button variant="outlined" onClick={() => setResetOpen(true)}>
                        Cambiar contraseña por correo
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="overline" color="text.secondary">Tu estado actual</Typography>
                      <Typography variant="h6" fontWeight={900}>
                        {perfilForm.dni && perfilForm.telefono && perfilForm.direccion ? 'Cuenta lista para comprar' : 'Completa tus datos de contacto'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={1.5}>
                        Solo se permite recojo en tienda. La boleta se genera al confirmar el pedido.
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip size="small" color={cartCount > 0 ? 'primary' : 'default'} label={`${cartCount} en carrito`} />
                        <Chip size="small" color={perfilForm.direccion ? 'success' : 'warning'} label={perfilForm.direccion ? 'Direccion registrada' : 'Falta direccion'} />
                        <Chip size="small" color={/^\d{8}$/.test(perfilForm.dni || '') ? 'success' : 'warning'} label={/^\d{8}$/.test(perfilForm.dni || '') ? 'DNI registrado' : 'Falta DNI'} />
                        <Chip size="small" color={perfilForm.telefono ? 'success' : 'warning'} label={perfilForm.telefono ? 'Telefono registrado' : 'Falta telefono'} />
                        <Chip size="small" color={perfilForm.email ? 'success' : 'warning'} label={perfilForm.email ? 'Correo para boleta' : 'Falta correo'} />
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="overline" color="text.secondary">Actividad reciente</Typography>
                      {perfilStats.ultimoPedido ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                          <Box>
                            <Typography variant="h6" fontWeight={900}>{perfilStats.ultimoPedido.id}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(perfilStats.ultimoPedido.fecha).toLocaleString('es-PE')} · {perfilStats.ultimoPedido.estado}
                            </Typography>
                          </Box>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button variant="outlined" startIcon={<ReceiptLong />} onClick={() => openBoleta(perfilStats.ultimoPedido)}>
                              Ver boleta
                            </Button>
                            <Button variant="contained" startIcon={<Download />} onClick={() => downloadBoleta(perfilStats.ultimoPedido)}>
                              Descargar
                            </Button>
                          </Stack>
                        </Stack>
                      ) : (
                        <Alert severity="info">Aun no tienes movimiento. Tu primer pedido aparecera aqui.</Alert>
                      )}
                    </Paper>

                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Typography variant="overline" color="text.secondary">Historial de compras</Typography>
                          <Typography variant="h5" fontWeight={900}>Mis pedidos</Typography>
                        </Box>
                        <Chip size="small" label={`${clientePedidos.length} pedidos`} color="primary" variant="outlined" />
                      </Stack>
                      {clientePedidos.length === 0 ? (
                        <Alert severity="info">Aun no tienes pedidos.</Alert>
                      ) : (
                        <List dense>
                          {clientePedidos.slice(0, 4).map((pedido) => (
                          <ListItem key={pedido.id} divider secondaryAction={
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" startIcon={<ReceiptLong />} onClick={() => openBoleta(pedido)}>
                                Ver
                              </Button>
                              <Button size="small" startIcon={<Download />} onClick={() => downloadBoleta(pedido)}>
                                Descargar
                              </Button>
                              {canCancelPedido(pedido) && (
                                <Button size="small" color="error" onClick={() => handleCancelarPedido(pedido)}>
                                  Cancelar
                                </Button>
                              )}
                            </Stack>
                          }>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: pedido.boletaEnviada ? '#1976d2' : '#78909c' }}>
                                  <ReceiptLong />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${pedido.id} - ${formatCurrency(pedido.total)}`}
                                secondary={`${pedido.estado} · ${new Date(pedido.fecha).toLocaleString('es-PE')}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Paper>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </>
        ) : checkoutOpen ? (
          <>
            {/* DISEÑO CLIENTE - CHECKOUT SEPARADO:
                Pantalla independiente para revisar carrito, elegir pago y confirmar pedido sin tapar el catalogo. */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} mb={2}>
              <Box>
                <Typography variant="h3" component="h1" fontWeight={900} sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
                  Tu carrito
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revisa cantidades, confirma recojo en tienda y elige tu metodo de pago.
                </Typography>
              </Box>
              <Chip label={`Items: ${cartCount}`} color="primary" variant="outlined" />
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Stack spacing={2}>
                  {cartRows.map(({ producto, cantidad, subtotal }) => (
                    <Paper key={producto.id} elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Avatar src={getProductImage(producto)} variant="rounded" sx={{ width: 72, height: 72, alignSelf: { xs: 'center', sm: 'auto' } }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={900}>{producto.nombre}</Typography>
                          <Typography variant="body2" color="text.secondary">{formatCurrency(producto.precioVenta)}</Typography>
                        </Box>
                        <TextField
                          type="number"
                          label="Cantidad"
                          value={cantidad}
                          onChange={(e) => updateCartQuantity(producto, Number(e.target.value))}
                          inputProps={{ min: 1, max: Number(producto.stockActual || 0) }}
                          sx={{ width: { xs: '100%', sm: 130 } }}
                        />
                        <Typography fontWeight={900} minWidth={90} textAlign={{ xs: 'left', sm: 'right' }}>
                          {formatCurrency(subtotal)}
                        </Typography>
                        <IconButton color="error" onClick={() => updateCartQuantity(producto, 0)}>
                          <Delete />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                  <Button variant="outlined" onClick={() => setCheckoutOpen(false)} sx={{ alignSelf: 'flex-start' }}>
                    Volver al catalogo
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2, position: { md: 'sticky' }, top: { md: 88 } }}>
                  <Typography variant="h6" fontWeight={900} mb={1.5}>Resumen</Typography>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Typography color="text.secondary">Subtotal</Typography>
                    <Typography fontWeight={800}>{formatCurrency(cartTotal)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" mb={2}>
                    <Typography color="text.secondary">Total a pagar</Typography>
                    <Typography variant="h6" fontWeight={900}>{formatCurrency(cartTotal)}</Typography>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography fontWeight={900} mb={1}>Entrega</Typography>
                  <Chip label="Recojo en tienda" color="success" sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Retira tu compra en tienda. No se cobra delivery.
                  </Typography>
                  <TextField
                    select
                    label="Metodo de pago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as 'RECOJO' | 'MERCADO_PAGO')}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="RECOJO">Pagar al momento de recoger</MenuItem>
                    <MenuItem value="MERCADO_PAGO">Mercado Pago</MenuItem>
                  </TextField>
                  <Button fullWidth size="large" variant="contained" startIcon={<Payment />} onClick={confirmOrder} disabled={paying || cartRows.length === 0}>
                    {paying ? 'Preparando pago...' : metodoPago === 'MERCADO_PAGO' ? 'Pagar con Mercado Pago' : 'Registrar pedido'}
                  </Button>
                  {metodoPago === 'MERCADO_PAGO' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Seras dirigido al checkout seguro de Mercado Pago. El pedido se registra cuando el pago sea aprobado.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </>
        ) : (
          <>
        {/* DISEÑO CLIENTE - HERO COMERCIAL:
            Presenta la tienda publica y lleva al cliente directo a comprar. */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" component="h1" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
            Catalogo de productos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Compra en linea, paga con Mercado Pago o al recoger, y retira tu pedido en tienda.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8.5}>
            {/* DISEÑO CLIENTE - BUSCADOR:
                Filtra productos publicos por nombre o descripcion. */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar productos"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                select
                label="Categoria"
                value={categoriaFiltro}
                onChange={(event) => setCategoriaFiltro(Number(event.target.value))}
                sx={{ minWidth: { xs: '100%', md: 240 } }}
              >
                <MenuItem value={0}>Todas las categorias</MenuItem>
                {categorias.map((categoria) => (
                  <MenuItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              <Chip
                label="Todas"
                color={categoriaFiltro === 0 ? 'primary' : 'default'}
                onClick={() => setCategoriaFiltro(0)}
                clickable
              />
              {categorias.map((categoria) => (
                <Chip
                  key={categoria.id}
                  label={categoria.nombre}
                  color={categoriaFiltro === categoria.id ? 'primary' : 'default'}
                  variant={categoriaFiltro === categoria.id ? 'filled' : 'outlined'}
                  onClick={() => setCategoriaFiltro(categoria.id)}
                  clickable
                />
              ))}
            </Stack>

            {/* DISEÑO CLIENTE - CATALOGO:
                Tarjetas visibles para el cliente con imagen, precio, stock y boton agregar. */}
            {loading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
              </Box>
            ) : productosVisibles.length === 0 ? (
              <Alert severity="info">No hay productos disponibles para mostrar.</Alert>
            ) : (
              <Grid container spacing={2}>
                {productosVisibles.map((producto) => {
                  const stock = Number(producto.stockActual || 0);
                  const cantidadEnCarrito = cartItems[producto.id] || 0;
                  return (
                    <React.Fragment key={producto.id}>
                      {/* Cuatro columnas en escritorio para conservar tarjetas y botones cómodos. */}
                    <Grid item xs={12} sm={6} md={4} xl={3}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardMedia
                          component="img"
                          height="160"
                          image={getProductImage(producto)}
                          alt={producto.nombre}
                          sx={{ objectFit: 'contain', bgcolor: '#ffffff', p: 1.5 }}
                        />
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                            {producto.nombre}
                          </Typography>
	                          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 38 }}>
	                            {producto.descripcion || 'Producto disponible en tienda'}
	                          </Typography>
	                          <Chip label={categoriaNombrePorId[producto.categoriaId] || 'Sin categoria'} size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="h6" color="primary" fontWeight={800}>
                              {formatCurrency(producto.precioVenta)}
                            </Typography>
                            <Chip label={`Stock ${stock}`} size="small" color={stock > 5 ? 'success' : 'warning'} />
                          </Stack>
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            disabled={cantidadEnCarrito >= stock}
                            onClick={() => addToCart(producto)}
                            sx={{ mt: 'auto' }}
                          >
                            Agregar al carrito
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                    </React.Fragment>
                  );
                })}
              </Grid>
            )}
          </Grid>

          <Grid item xs={12} lg={3.5}>
            {/* DISEÑO CLIENTE - PANEL CARRITO:
                Muestra productos seleccionados, controles de cantidad, subtotal y total. */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 2.5 }, position: { lg: 'sticky' }, top: { lg: 88 } }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <LocalMall color="primary" />
                <Typography variant="h6" fontWeight={800}>
                  Carrito
                </Typography>
              </Stack>
              {cartRows.length === 0 ? (
                <Alert severity="info">Tu carrito esta vacio.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {cartRows.map(({ producto, cantidad, subtotal }) => (
                    <Box key={producto.id} sx={{ borderBottom: '1px solid #e5e7eb', pb: 1.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={getProductImage(producto)} variant="rounded" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {producto.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(producto.precioVenta)} c/u
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Eliminar ${producto.nombre} del carrito`}
                          onClick={() => updateCartQuantity(producto, 0)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconButton
                            size="small"
                            aria-label={`Disminuir cantidad de ${producto.nombre}`}
                            onClick={() => updateCartQuantity(producto, cantidad - 1)}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography fontWeight={800}>{cantidad}</Typography>
                          <IconButton
                            size="small"
                            aria-label={`Aumentar cantidad de ${producto.nombre}`}
                            onClick={() => updateCartQuantity(producto, cantidad + 1)}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography fontWeight={800}>{formatCurrency(subtotal)}</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />
              <Stack direction="row" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6" fontWeight={900}>{formatCurrency(cartTotal)}</Typography>
              </Stack>
              <Button fullWidth variant="contained" size="large" onClick={openCheckout} disabled={cartRows.length === 0}>
                Continuar compra
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                Entrega disponible: recojo en tienda.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
          </>
        )}
      </Container>

      {/* DISEÑO CLIENTE - DIALOGO ACCESO/REGISTRO:
          Login y registro se mantienen separados del pago para que el flujo sea mas ordenado. */}
      <Dialog open={authOpen} onClose={() => setAuthOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { mx: { xs: 1.5, sm: 3 } } }}>
        <DialogTitle>{authStep === 'login' ? 'Iniciar sesión' : 'Registrarse'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {authStep === 'login'
              ? 'Ingresa con una cuenta registrada para ver tu historial y continuar compras.'
              : 'Crea tu cuenta de cliente antes de continuar con el pedido.'}
          </Typography>
          {authStep === 'login' ? (
            <>
              {/* DISEÑO CLIENTE - LOGIN:
                  Muestra correos registrados localmente y permite iniciar sesion con contraseña. */}
              <Stack spacing={2}>
                <TextField label="Correo" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} fullWidth />
                <TextField label="Contraseña" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} fullWidth />
                <Button variant="contained" onClick={loginClienteSeguro}>
                  Ingresar
                </Button>
                <Button onClick={() => setResetOpen(true)}>¿Olvidaste tu contraseña?</Button>
              </Stack>
              <Divider sx={{ my: 2 }}>o</Divider>
              <GoogleSignInButton onCredential={handleClienteGoogleCredential} />
              <Divider sx={{ my: 2 }}>o</Divider>
              <Button fullWidth variant="outlined" onClick={() => setAuthStep('register')}>
                Crear cuenta nueva
              </Button>
            </>
          ) : (
            <>
              {/* DISEÑO CLIENTE - REGISTRO:
                  Primero puede acceder con Google y luego completa datos obligatorios del cliente. */}
              <GoogleSignInButton onCredential={handleClienteGoogleCredential} />
              <Alert severity="info" sx={{ mt: 2 }}>
                Con Google se valida el correo de forma segura. Luego completa DNI y teléfono para comprar.
              </Alert>
              <Stack spacing={2} mt={2}>
                <TextField label="Nombre completo" value={perfilForm.nombre} onChange={(e) => setPerfilForm((prev) => ({ ...prev, nombre: e.target.value }))} fullWidth required />
                <TextField label="DNI" value={perfilForm.dni} onChange={(e) => setPerfilForm((prev) => ({ ...prev, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))} fullWidth required inputProps={{ maxLength: 8, inputMode: 'numeric' }} />
                <TextField label="Correo" type="email" value={perfilForm.email} onChange={(e) => setPerfilForm((prev) => ({ ...prev, email: e.target.value }))} fullWidth required />
                <TextField label="Telefono" value={perfilForm.telefono} onChange={(e) => setPerfilForm((prev) => ({ ...prev, telefono: e.target.value.replace(/\D/g, '').slice(0, 9) }))} fullWidth required inputProps={{ maxLength: 9, inputMode: 'numeric' }} helperText="Debe tener 9 digitos" />
                <TextField label="Contraseña" type="password" value={perfilForm.password || ''} onChange={(e) => setPerfilForm((prev) => ({ ...prev, password: e.target.value }))} helperText="Obligatoria. Mínimo 8 caracteres, mayúscula, minúscula y número." fullWidth required />
                <TextField label="Direccion referencial" value={perfilForm.direccion} onChange={(e) => setPerfilForm((prev) => ({ ...prev, direccion: e.target.value }))} fullWidth />
              </Stack>
              <Divider sx={{ my: 2 }}>o</Divider>
              <Button fullWidth variant="text" onClick={() => setAuthStep('login')}>
                Ya tengo cuenta
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuthOpen(false)}>Cancelar</Button>
          {authStep === 'register' && (
            <Button variant="contained" onClick={() => {
              savePerfil();
            }}>
              Crear cuenta y continuar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* DISEÑO CLIENTE - HISTORIAL:
          Lista las compras guardadas localmente con estado y productos. */}
      <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} accountType="cliente" defaultEmail={loginEmail} />

      <Dialog open={historialOpen} onClose={() => setHistorialOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Historial de compras</DialogTitle>
        <DialogContent dividers>
          {clientePedidos.length === 0 ? (
            <Alert severity="info">Aun no tienes compras registradas.</Alert>
          ) : (
            <List>
              {clientePedidos.map((pedido) => (
	                <ListItem
	                  key={pedido.id}
	                  alignItems="flex-start"
	                  divider
	                  secondaryAction={
	                    <Stack direction="row" spacing={0.5}>
	                      <Button size="small" startIcon={<ReceiptLong />} onClick={() => openBoleta(pedido)}>
	                        Ver
	                      </Button>
	                      <Button size="small" startIcon={<Download />} onClick={() => downloadBoleta(pedido)}>
	                        Descargar
	                      </Button>
	                      {canCancelPedido(pedido) && (
	                        <Button size="small" color="error" onClick={() => handleCancelarPedido(pedido)}>
	                          Cancelar
	                        </Button>
	                      )}
	                    </Stack>
	                  }
	                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: pedido.metodoPago === 'MERCADO_PAGO' ? '#1565c0' : '#0f766e' }}>
                      <LocalMall />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${pedido.id} - ${formatCurrency(pedido.total)}`}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {pedido.estado} · Recojo en tienda · {new Date(pedido.fecha).toLocaleString('es-PE')}
                        </Typography>
                        <br />
                        {pedido.cancelacionMotivo && (
                          <>
                            Cancelacion: {pedido.cancelacionMotivo}
                            <br />
                          </>
                        )}
                        {pedido.reembolsoEstado && (
                          <>
                            Reembolso: {pedido.reembolsoEstado}
                            <br />
                          </>
                        )}
                        {pedido.productos.map((item) => `${item.nombre} x${item.cantidad}`).join(', ')}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistorialOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClienteTiendaPage;
