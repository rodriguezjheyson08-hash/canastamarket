import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  Button,
  Box,
  Snackbar,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  TextField,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { ShoppingCart, Add, Remove, Delete, Clear, Print } from '@mui/icons-material';
import { Producto, Venta, Categoria, VentaCreatePayload } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  createMercadoPagoPreference,
  createVenta,
  getCategorias,
  getMercadoPagoPayment,
  getProductos
} from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClienteDniData, buscarClientePorDni } from '../apidni/dniService';
import { BOLETA_CONFIG_UPDATE_EVENT, BoletaConfig, loadBoletaConfig } from '../utils/boletaConfig';
import { saveVentaClienteInfo } from '../utils/ventasClienteMap';
import { saveVentaVendedorInfo } from '../utils/ventasVendedorMap';
import { useAuth } from '../contexts/AuthContext';

// Imágenes de ejemplo para bebidas
const imagenesBebidas: Record<string, string> = {
  'Ron Barceló': 'https://www.licoresmedellin.com/cdn/shop/products/ron-barcelo-anejo-700ml.jpg?v=1677692782',
  'Cerveza Corona': 'https://www.latiendadelcervecero.com/cdn/shop/products/Corona355ml.png?v=1614359782',
  'Tequila Don Julio': 'https://cdn.shopify.com/s/files/1/0257/6089/3921/products/tequila-don-julio-reposado-750ml.png?v=1642521072',
  'Whisky Johnnie Walker': 'https://www.licoresmedellin.com/cdn/shop/products/whisky-johnnie-walker-red-label-700ml.jpg?v=1677692782',
  'Vodka Smirnoff': 'https://www.latiendadelcervecero.com/cdn/shop/products/Smirnoff700ml.png?v=1614359782',
};

interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

interface ClienteBoleta {
  dni: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
}

interface MPPendingSale {
  items: Array<{ productoId: number; cantidad: number }>;
  total: number;
  cliente?: ClienteBoleta | null;
  externalReference?: string | null;
}

const QR_YAPE = `${process.env.PUBLIC_URL}/images/yape.png`;
const MESA_SERVICE_CATEGORY = 'servicios';
const MESA_SERVICE_DESCRIPTION = 'servicio de mesa de billar';
const MP_PENDING_SALE_STORAGE_KEY = 'mp_pending_sale';
const MP_MIN_AMOUNT = 1;

const readPendingSale = (): MPPendingSale | null => {
  try {
    const raw = localStorage.getItem(MP_PENDING_SALE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MPPendingSale;
  } catch {
    return null;
  }
};

const canUseMercadoPagoBackUrls = (rawBase: string) => {
  try {
    const parsed = new URL(rawBase);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const VentasPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [modalPago, setModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'yape' | 'mercadopago'>('efectivo');
  const [recibido, setRecibido] = useState('');
  const [vuelto, setVuelto] = useState(0);
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('all');
  const [ventaReciente, setVentaReciente] = useState<Venta | null>(null);
  const [clienteBoleta, setClienteBoleta] = useState<ClienteBoleta | null>(null);
  const [emitirConCliente, setEmitirConCliente] = useState(false);
  const [dniCliente, setDniCliente] = useState('');
  const [nombresCliente, setNombresCliente] = useState('');
  const [apellidosCliente, setApellidosCliente] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [boletaEmpresa, setBoletaEmpresa] = useState<BoletaConfig>(() => loadBoletaConfig());
  const [mpLoading, setMpLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mpPaymentLink = process.env.REACT_APP_MP_PAYMENT_LINK;
  const { user } = useAuth();

  const vendedorPayload = {
    vendedorId: user?.id || null,
    vendedorUsuario: user?.nombreUsuario || null,
    vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProductos(), fetchCategorias()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const reloadBoletaConfig = () => setBoletaEmpresa(loadBoletaConfig());
    window.addEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
    window.addEventListener('storage', reloadBoletaConfig);
    return () => {
      window.removeEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
      window.removeEventListener('storage', reloadBoletaConfig);
    };
  }, []);

  const fetchProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      setProductos([]);
      showSnackbar('Error al cargar productos', 'error');
    }
  };

  const fetchCategorias = async () => {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      setCategorias([]);
      showSnackbar('Error al cargar categorías', 'error');
    }
  };

  const resetDatosCliente = () => {
    setEmitirConCliente(false);
    setDniCliente('');
    setNombresCliente('');
    setApellidosCliente('');
  };

  const normalizeCliente = (cliente: ClienteDniData | ClienteBoleta): ClienteBoleta => {
    const nombres = cliente.nombres?.trim() || '';
    const apellidos = cliente.apellidos?.trim() || '';
    const nombreCompleto = cliente.nombreCompleto?.trim() || [nombres, apellidos].filter(Boolean).join(' ').trim();
    return {
      dni: (cliente.dni || '').trim(),
      nombres,
      apellidos,
      nombreCompleto
    };
  };

  const getClienteBoletaActual = (): ClienteBoleta | null => {
    if (!emitirConCliente) return null;

    const payload = normalizeCliente({
      dni: dniCliente,
      nombres: nombresCliente,
      apellidos: apellidosCliente,
      nombreCompleto: [nombresCliente, apellidosCliente].filter(Boolean).join(' ').trim()
    });

    if (!payload.dni && !payload.nombreCompleto && !payload.nombres && !payload.apellidos) {
      return null;
    }

    return payload;
  };

  const handleBuscarClienteDni = async () => {
    const dni = dniCliente.trim();
    if (!/^\d{8}$/.test(dni)) {
      showSnackbar('Ingresa un DNI válido de 8 dígitos', 'error');
      return;
    }

    try {
      setBuscandoCliente(true);
      const cliente = await buscarClientePorDni(dni);
      const normalized = normalizeCliente(cliente);
      setDniCliente(normalized.dni);
      setNombresCliente(normalized.nombres);
      setApellidosCliente(normalized.apellidos);
      showSnackbar('Cliente encontrado', 'success');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo consultar el DNI';
      showSnackbar(message, 'error');
    } finally {
      setBuscandoCliente(false);
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(item => item.producto.id === producto.id);
      if (idx >= 0) {
        // Si ya está, aumenta la cantidad
        const nuevo = [...prev];
        if (nuevo[idx].cantidad < producto.stockActual) {
          nuevo[idx].cantidad += 1;
        }
        return nuevo;
      } else {
        return [...prev, { producto, cantidad: 1 }];
      }
    });
  };

  const quitarDelCarrito = (productoId: number) => {
    setCarrito(prev => prev.filter(item => item.producto.id !== productoId));
  };

  const cambiarCantidad = (productoId: number, cantidad: number) => {
    setCarrito(prev => prev.map(item =>
      item.producto.id === productoId
        ? { ...item, cantidad: Math.max(1, Math.min(cantidad, item.producto.stockActual)) }
        : item
    ));
  };

  const limpiarCarrito = () => setCarrito([]);

  const calcularTotal = useCallback(
    () => carrito.reduce((sum, item) => sum + item.producto.precioVenta * item.cantidad, 0),
    [carrito]
  );

  useEffect(() => {
    if (metodoPago === 'efectivo') {
      const rec = parseFloat(recibido);
      setVuelto(rec > 0 ? rec - calcularTotal() : 0);
    } else {
      setVuelto(0);
    }
  }, [recibido, metodoPago, calcularTotal]);

  const clearPendingSale = () => {
    localStorage.removeItem(MP_PENDING_SALE_STORAGE_KEY);
  };

  const paymentAmountMatches = (expected: number, paid?: number) =>
    Number.isFinite(Number(paid)) && Math.abs(Number(paid) - Number(expected || 0)) <= 0.01;

  const registrarVentaDesdePagoPendiente = async (pending: MPPendingSale | null) => {
    if (!pending || !Array.isArray(pending.items) || pending.items.length === 0) {
      throw new Error('Pago aprobado pero no se encontró venta pendiente.');
    }

    const venta = await createVenta({
      productosVendidos: pending.items,
      total: pending.total,
      metodoPago: 'mercadopago',
      recibido: pending.total,
      vuelto: 0,
      clienteDni: pending?.cliente?.dni || null,
      clienteNombre: pending?.cliente?.nombreCompleto || null,
      ...vendedorPayload
    });

    saveVentaClienteInfo(venta.id, {
      clienteNombre: pending?.cliente?.nombreCompleto || null,
      clienteDni: pending?.cliente?.dni || null
    });
    saveVentaVendedorInfo(venta.id, {
      vendedorId: user?.id || null,
      vendedorUsuario: user?.nombreUsuario || null,
      vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
    });

    clearPendingSale();
    setVentaReciente(venta);
    setClienteBoleta(pending.cliente ? normalizeCliente(pending.cliente) : null);
    limpiarCarrito();
    await fetchProductos();
    if (window && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('ventaRealizada'));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentId = params.get('payment_id') || params.get('collection_id');
    if (!paymentId) return;

    const finalizeMercadoPago = async () => {
      try {
        const pago = await getMercadoPagoPayment(paymentId);
        if (pago.status !== 'approved') {
          showSnackbar(`Pago ${pago.status}`, 'error');
          return;
        }
        const pending = readPendingSale();
        if (!pending) {
          showSnackbar('Pago aprobado pero no se encontró la venta pendiente.', 'error');
          return;
        }
        if (pago.transaction_amount !== undefined && !paymentAmountMatches(pending.total, Number(pago.transaction_amount))) {
          showSnackbar('El monto pagado no coincide con el total pendiente.', 'error');
          return;
        }
        await registrarVentaDesdePagoPendiente(pending);
        showSnackbar('Pago aprobado y venta registrada', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo confirmar el pago.';
        showSnackbar(message, 'error');
      } finally {
        navigate(location.pathname, { replace: true });
      }
    };

    finalizeMercadoPago();
  }, [location.search, location.pathname, navigate]);

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    try {
      setSaving(true);
      const clienteActual = getClienteBoletaActual();
      const ventaData: VentaCreatePayload = {
        productosVendidos: carrito.map(item => ({
          producto: item.producto,
          cantidad: item.cantidad
        })),
        total: calcularTotal(),
        metodoPago,
        recibido: parseFloat(recibido) || 0,
        vuelto: vuelto || 0,
        clienteDni: clienteActual?.dni || null,
        clienteNombre: clienteActual?.nombreCompleto || null,
        ...vendedorPayload
      };
      const nuevaVenta = await createVenta(ventaData);
      saveVentaClienteInfo(nuevaVenta.id, {
        clienteNombre: clienteActual?.nombreCompleto || null,
        clienteDni: clienteActual?.dni || null
      });
      saveVentaVendedorInfo(nuevaVenta.id, {
        vendedorId: user?.id || null,
        vendedorUsuario: user?.nombreUsuario || null,
        vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
      });
      clearPendingSale();
      setVentaReciente(nuevaVenta);
      setClienteBoleta(clienteActual);
      showSnackbar('Venta realizada exitosamente', 'success');
      limpiarCarrito();
      await fetchProductos();
      if (window && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('ventaRealizada'));
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al guardar venta';
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const iniciarPagoMercadoPago = async () => {
    if (carrito.length === 0) return;
    if (calcularTotal() < MP_MIN_AMOUNT) {
      showSnackbar(`Mercado Pago requiere un monto mínimo de ${formatCurrency(MP_MIN_AMOUNT)}.`, 'error');
      return;
    }
    setMpLoading(true);
    try {
      if (mpPaymentLink) {
        window.location.assign(mpPaymentLink);
        return;
      }

      const items = carrito.map(item => ({
        title: item.producto.nombre,
        quantity: item.cantidad,
        unit_price: Number(item.producto.precioVenta || 0)
      }));
      const origin = window.location.origin;
      const backBase = process.env.REACT_APP_MP_BACK_URL_BASE || origin;
      const backUrl = `${backBase}/dashboard/ventas`;
      const notificationUrl = process.env.REACT_APP_MP_NOTIFICATION_URL;
      const canSendUrls = canUseMercadoPagoBackUrls(backBase);
      const externalReference = `venta-${Date.now()}`;

      const preference = await createMercadoPagoPreference({
        items,
        ...(canSendUrls
          ? {
              backUrls: {
                success: backUrl,
                failure: backUrl,
                pending: backUrl
              },
              notificationUrl
            }
          : {}),
        externalReference
      });

      const initPoint = preference.init_point || preference.sandbox_init_point;
      if (!initPoint) {
        throw new Error('No se recibió el link de pago.');
      }

      const pendingPayload: MPPendingSale = {
        items: carrito.map(item => ({ productoId: item.producto.id, cantidad: item.cantidad })),
        total: calcularTotal(),
        cliente: getClienteBoletaActual(),
        externalReference
      };
      localStorage.setItem(MP_PENDING_SALE_STORAGE_KEY, JSON.stringify(pendingPayload));
      setModalPago(false);
      window.location.assign(initPoint);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al generar pago con Mercado Pago';
      const details = error?.response?.data?.details;
      const detailText = details ? ` (${JSON.stringify(details)})` : '';
      showSnackbar(`${message}${detailText}`, 'error');
    } finally {
      setMpLoading(false);
    }
  };

  const registrarVentaManual = async () => {
    if (carrito.length === 0) return;
    const confirmPaid = window.confirm(
      '¿El pago ya fue realizado? Esta acción no valida con Mercado Pago.'
    );
    if (!confirmPaid) return;
    try {
      setSaving(true);
      const clienteActual = getClienteBoletaActual();
      const venta = await createVenta({
        productosVendidos: carrito.map(item => ({
          productoId: item.producto.id,
          cantidad: item.cantidad
        })),
        total: calcularTotal(),
        metodoPago: 'mercadopago_link',
        recibido: calcularTotal(),
        vuelto: 0,
        clienteDni: clienteActual?.dni || null,
        clienteNombre: clienteActual?.nombreCompleto || null,
        ...vendedorPayload
      });
      saveVentaClienteInfo(venta.id, {
        clienteNombre: clienteActual?.nombreCompleto || null,
        clienteDni: clienteActual?.dni || null
      });
      saveVentaVendedorInfo(venta.id, {
        vendedorId: user?.id || null,
        vendedorUsuario: user?.nombreUsuario || null,
        vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
      });
      clearPendingSale();
      setVentaReciente(venta);
      setClienteBoleta(clienteActual);
      limpiarCarrito();
      await fetchProductos();
      setModalPago(false);
      resetDatosCliente();
      if (window && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('ventaRealizada'));
      }
      showSnackbar('Venta registrada manualmente', 'success');
    } catch (error) {
      showSnackbar('No se pudo registrar la venta', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) return 'S/ 0.00';
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  const getVentaTotal = (venta: Venta) => {
    if (typeof venta.total === 'number' && !isNaN(venta.total)) return venta.total;
    return venta.productosVendidos.reduce((sum, item) => {
      const precio = item.producto.precioVenta ?? 0;
      const cantidad = item.cantidad || 1;
      return sum + precio * cantidad;
    }, 0);
  };

  const formatFechaVenta = (fecha?: string) => {
    if (!fecha) return new Date().toLocaleString('es-PE');
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      return new Date().toLocaleString('es-PE');
    }
    return parsed.toLocaleString('es-PE');
  };

  const formatBoletaNumero = (venta: Venta) => {
    const raw = venta.numero ?? venta.id;
    if (!raw) return '-----';
    return String(raw).padStart(5, '0');
  };

  const formatBoletaSerieNumero = (venta: Venta) => {
    const raw = venta.numero ?? venta.id ?? 0;
    return `${boletaEmpresa.serie} - ${String(raw).padStart(6, '0')}`;
  };

  const formatFechaBoleta = (fecha?: string) => {
    if (!fecha) return new Date().toLocaleDateString('en-CA');
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      return new Date().toLocaleDateString('en-CA');
    }
    return parsed.toLocaleDateString('en-CA');
  };

  const formatMetodoPagoBoleta = (metodo?: string) => {
    if (!metodo) return '-';
    const key = metodo.toLowerCase();
    if (key === 'mercadopago') return 'Mercado Pago';
    if (key === 'mercadopago_link') return 'Mercado Pago';
    if (key === 'yape') return 'Yape';
    if (key === 'efectivo') return 'Efectivo';
    return metodo;
  };

  const handleFinalizarVenta = () => {
    resetDatosCliente();
    setModalPago(true);
  };

  const handleConfirmarVenta = async () => {
    if (metodoPago === 'mercadopago') {
      await iniciarPagoMercadoPago();
      return;
    }
    if (metodoPago === 'efectivo' && (parseFloat(recibido) < calcularTotal())) {
      showSnackbar('El monto recibido es insuficiente', 'error');
      return;
    }
    await finalizarVenta();
    setModalPago(false);
    setMetodoPago('efectivo');
    setRecibido('');
    setVuelto(0);
    resetDatosCliente();
  };

  // Filtro de productos por búsqueda
  const categoriaNombreById = categorias.reduce<Record<number, string>>((acc, categoria) => {
    acc[categoria.id] = (categoria.nombre || '').trim().toLowerCase();
    return acc;
  }, {});

  const esProductoServicioMesa = (producto: Producto) => {
    const categoriaNombre = categoriaNombreById[producto.categoriaId] || '';
    const nombre = (producto.nombre || '').trim().toLowerCase();
    const descripcion = (producto.descripcion || '').trim().toLowerCase();

    return (
      categoriaNombre === MESA_SERVICE_CATEGORY ||
      descripcion === MESA_SERVICE_DESCRIPTION ||
      /^mesa\s*\d+\s*\(billar\)$/i.test(nombre)
    );
  };

  const searchTerm = search.trim().toLowerCase();

  const productosFiltrados = productos
    .filter((producto) => {
      if (esProductoServicioMesa(producto)) return false;
      if (categoriaFiltro !== 'all' && producto.categoriaId !== Number(categoriaFiltro)) return false;
      if (!searchTerm) return true;
      const textoBusqueda = `${producto.nombre} ${producto.descripcion || ''}`.toLowerCase();
      return textoBusqueda.includes(searchTerm);
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  const categoriasVisibles = categorias.filter(
    (categoria) => (categoria.nombre || '').trim().toLowerCase() !== MESA_SERVICE_CATEGORY
  );

  const categoriaNombrePorId = categoriasVisibles.reduce<Record<number, string>>((acc, cat) => {
    acc[cat.id] = cat.nombre;
    return acc;
  }, {});

  // Función para imprimir solo la boleta
  const imprimirBoleta = () => {
    const printContents = document.getElementById('boleta-print')?.innerHTML;
    if (!printContents) return;
    const boletaNumero = ventaReciente ? formatBoletaSerieNumero(ventaReciente) : 'SIN-NUMERO';
    const printTitle = `Boleta de Venta ${boletaNumero}`;
    const win = window.open('', '', 'width=900,height=1100');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${printTitle}</title>
          <style>
            @page { size: A5 portrait; margin: 9mm 8mm 7mm 8mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            .boleta-a4 {
              width: 100%;
              max-width: 132mm;
              margin: 0 auto;
              border: none;
              padding: 0;
              background: #efefef;
            }
            .boleta-title-wrap { text-align: center; margin-bottom: 10px; }
            .boleta-title {
              display: inline-block;
              color: #d40000;
              font-size: 14pt;
              font-weight: 700;
              padding: 0;
              letter-spacing: 0.5px;
            }
            .boleta-top-row {
              display: grid;
              grid-template-columns: 62fr 38fr;
              gap: 10px;
              margin-bottom: 10px;
              align-items: start;
            }
            .boleta-empresa-box { font-size: 9.5pt; line-height: 1.22; padding: 2px 2px; }
            .boleta-doc-box, .boleta-client-box, .boleta-logo-box {
              border: 1px solid #6b7280;
              background: transparent;
              padding: 4px;
            }
            .boleta-doc-box { text-align: center; }
            .doc-ruc {
              border-bottom: 1px solid #7d8594;
              font-size: 10.5pt;
              font-weight: 700;
              margin-bottom: 3px;
              padding-bottom: 2px;
            }
            .doc-type {
              border-bottom: 1px solid #7d8594;
              background: #b9e6b9;
              background-color: #b9e6b9 !important;
              box-shadow: inset 0 0 0 1000px #b9e6b9;
              font-size: 10.5pt;
              font-weight: 800;
              margin-bottom: 3px;
              padding: 3px 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .doc-num {
              display: block;
              color: #d40000;
              font-size: 11pt;
              font-weight: 800;
              padding: 0;
            }
            .boleta-mid-row {
              display: grid;
              grid-template-columns: 60fr 40fr;
              gap: 0;
              margin-bottom: 10px;
              min-height: 120px;
            }
            .boleta-client-box { font-size: 9.5pt; line-height: 1.2; }
            .boleta-logo-box {
              display: flex;
              justify-content: center;
              align-items: center;
              background: transparent;
            }
            .boleta-logo-box img {
              max-width: 95%;
              max-height: 95px;
              object-fit: contain;
            }
            .boleta-section-title {
              display: inline-block;
              margin: 8px 0 5px;
              color: #0b8f16;
              font-size: 10.5pt;
              font-weight: 800;
              padding: 0;
            }
            .boleta-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 2px;
              background: #fff;
            }
            .boleta-table th, .boleta-table td {
              border: 1px solid #666;
              padding: 4px 6px;
              font-size: 9.5pt;
            }
            .boleta-table th {
              background: #ececec;
              font-weight: 700;
              text-align: center;
            }
            .boleta-col-cant { width: 80px; text-align: center; }
            .boleta-col-money { width: 140px; text-align: right; }
            .boleta-total-row {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              gap: 12px;
              margin-top: 8px;
              font-size: 10.5pt;
              font-weight: 800;
              color: #0b8f16;
            }
            .boleta-footer {
              margin: 10px auto 0;
              max-width: 280px;
              text-align: center;
              font-size: 9.5pt;
              padding: 0;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.document.title = printTitle;
    win.focus();
    win.print();
    win.close();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={4}>
        {/* Columna de productos (80%) */}
        <Grid item xs={12} md={9} lg={9}>
          <Box mb={3} display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Buscar producto"
              variant="outlined"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                endAdornment: search && (
                  <IconButton aria-label="Limpiar búsqueda" onClick={() => setSearch('')} edge="end">
                    <Clear />
                  </IconButton>
                )
              }}
            />
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="categoria-filtro-label">Categoría</InputLabel>
              <Select
                labelId="categoria-filtro-label"
                value={categoriaFiltro}
                label="Categoría"
                onChange={(e) => setCategoriaFiltro(String(e.target.value))}
              >
                <MenuItem value="all">Todas</MenuItem>
                {categoriasVisibles.map((cat) => (
                  <MenuItem key={cat.id} value={String(cat.id)}>
                    {cat.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {productosFiltrados.length === 0 ? (
            <Typography color="text.secondary">No se encontraron productos.</Typography>
          ) : (
            <Grid container spacing={3}>
              {productosFiltrados.map((producto) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={producto.id}>
                  <Card
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      p: 2,
                      minHeight: 265,
                      height: 'auto',
                      minWidth: 0,
                      boxShadow: 3,
                      border: producto.stockActual < 10 ? '2px solid #ff9800' : undefined
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={producto.imagen || imagenesBebidas[producto.nombre] || 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png'}
                      alt={producto.nombre}
                      sx={{ width: 70, height: 120, objectFit: 'contain', borderRadius: 2, bgcolor: '#f5f5f5', mb: 1 }}
                    />
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{
                        width: '100%',
                        textAlign: 'center',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: 1.2
                      }}
                    >
                      {producto.nombre}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 0.5, display: 'block', minHeight: 16 }}
                    >
                      {categoriaNombrePorId[producto.categoriaId] || 'Sin categoría'}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 20 }}
                    >
                      {producto.descripcion}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" color="primary" fontWeight="bold">
                        {formatCurrency(producto.precioVenta ?? 0)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={producto.stockActual < 10 ? 'error' : 'text.secondary'}
                        sx={{ fontWeight: producto.stockActual < 10 ? 'bold' : undefined }}
                      >
                        Stock: {producto.stockActual}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      fullWidth
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={producto.stockActual === 0}
                      aria-label={`Agregar ${producto.nombre} al carrito`}
                    >
                      <ShoppingCart sx={{ mr: 1 }} fontSize="small" />
                      Agregar
                    </Button>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
        {/* Columna del carrito (20%) */}
        <Grid item xs={12} md={3} lg={3}>
          <Box sx={{ p: 3, borderRadius: 2, boxShadow: 3, bgcolor: 'background.paper', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom>
              Carrito de compras
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {carrito.length === 0 ? (
              <Typography color="text.secondary">El carrito está vacío.</Typography>
            ) : (
              <List sx={{ flexGrow: 1, maxHeight: 350, overflowY: 'auto' }}>
                {carrito.map(item => (
                  <ListItem key={item.producto.id} alignItems="flex-start">
                    <ListItemText
                      primary={item.producto.nombre}
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(item.producto.precioVenta ?? 0)} x {item.cantidad}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <IconButton size="small" onClick={() => cambiarCantidad(item.producto.id, item.cantidad - 1)} disabled={item.cantidad <= 1}>
                              <Remove />
                            </IconButton>
                            <TextField
                              type="number"
                              size="small"
                              value={item.cantidad}
                              onChange={e => cambiarCantidad(item.producto.id, Math.max(1, Math.min(Number(e.target.value), item.producto.stockActual)))}
                              inputProps={{ min: 1, max: item.producto.stockActual, style: { width: 40, textAlign: 'center' } }}
                            />
                            <IconButton size="small" onClick={() => cambiarCantidad(item.producto.id, item.cantidad + 1)} disabled={item.cantidad >= item.producto.stockActual}>
                              <Add />
                            </IconButton>
                          </Box>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" color="error" onClick={() => quitarDelCarrito(item.producto.id)} aria-label={`Quitar ${item.producto.nombre} del carrito`}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">{formatCurrency(calcularTotal() ?? 0)}</Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={carrito.length === 0 || saving}
              onClick={handleFinalizarVenta}
            >
              Finalizar venta
            </Button>
            <Button
              variant="text"
              color="secondary"
              fullWidth
              sx={{ mt: 1 }}
              onClick={limpiarCarrito}
              disabled={carrito.length === 0 || saving}
            >
              Vaciar carrito
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Modal de pago */}
      <Dialog
        open={modalPago}
        onClose={() => {
          setModalPago(false);
          resetDatosCliente();
        }}
      >
        <DialogTitle>Finalizar venta</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Total a pagar: <b>{formatCurrency(calcularTotal() ?? 0)}</b>
          </Typography>
          <RadioGroup
            row
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value as 'efectivo' | 'yape' | 'mercadopago')}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="efectivo" control={<Radio />} label="Efectivo" />
            <FormControlLabel value="yape" control={<Radio />} label="Yape" />
            <FormControlLabel value="mercadopago" control={<Radio />} label="Mercado Pago" />
          </RadioGroup>
          {metodoPago === 'efectivo' ? (
            <>
              <TextField
                label="Recibido"
                type="number"
                value={recibido}
                onChange={e => setRecibido(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                }}
                inputProps={{ min: calcularTotal() ?? 0 }}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2">
                Vuelto: <b style={{ color: vuelto < 0 ? 'red' : 'green' }}>{formatCurrency(vuelto ?? 0)}</b>
              </Typography>
            </>
          ) : metodoPago === 'yape' ? (
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Escanea el código QR para pagar con Yape
              </Typography>
              <img src={QR_YAPE} alt="QR Yape" style={{ width: 180, height: 180, margin: '0 auto' }} />
            </Box>
          ) : (
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Mercado Pago se abrirá en esta misma ventana para completar el pago.
              </Typography>
              {mpPaymentLink && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Link de pago fijo configurado. El registro será manual.
                </Typography>
              )}
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={emitirConCliente}
                onChange={(_, checked) => setEmitirConCliente(checked)}
              />
            }
            label="Agregar datos del cliente en boleta (opcional)"
          />
          {emitirConCliente && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Datos del cliente
              </Typography>
              <Box display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
                <TextField
                  label="DNI"
                  value={dniCliente}
                  onChange={e => setDniCliente(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  inputProps={{ maxLength: 8 }}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={handleBuscarClienteDni}
                  disabled={buscandoCliente || dniCliente.trim().length !== 8}
                >
                  {buscandoCliente ? 'Buscando...' : 'Buscar'}
                </Button>
              </Box>
              <Box display="flex" gap={1}>
                <TextField
                  label="Nombres"
                  value={nombresCliente}
                  onChange={e => setNombresCliente(e.target.value)}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Apellidos"
                  value={apellidosCliente}
                  onChange={e => setApellidosCliente(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setModalPago(false);
              resetDatosCliente();
            }}
            color="secondary"
          >
            Cancelar
          </Button>
          {metodoPago === 'mercadopago' && mpPaymentLink ? (
            <>
              <Button
                onClick={() => window.location.assign(mpPaymentLink)}
                variant="contained"
                color="primary"
                disabled={mpLoading}
              >
                Continuar con Mercado Pago
              </Button>
              <Button
                onClick={registrarVentaManual}
                variant="outlined"
                color="primary"
                disabled={saving}
              >
                Registrar venta
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConfirmarVenta}
              variant="contained"
              color="primary"
              disabled={
                saving ||
                mpLoading ||
                (metodoPago === 'efectivo' && parseFloat(recibido) < calcularTotal())
              }
            >
              {metodoPago === 'mercadopago' ? 'Continuar con Mercado Pago' : 'Confirmar y registrar venta'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal de boleta al finalizar venta */}
      <Dialog
        open={!!ventaReciente}
        onClose={() => {
          setVentaReciente(null);
          setClienteBoleta(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Venta realizada</DialogTitle>
        <DialogContent dividers>
          {ventaReciente && typeof ventaReciente === 'object' && (
            <Box
              id="boleta-print"
              className="boleta-a4"
              sx={{
                width: '100%',
                maxWidth: 620,
                mx: 'auto',
                border: 'none',
                p: 1.5,
                bgcolor: '#efefef',
                color: '#111',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              <Box className="boleta-title-wrap" sx={{ textAlign: 'center', mb: 1.5 }}>
                <Box
                  className="boleta-title"
                  sx={{
                    display: 'inline-block',
                    color: '#d40000',
                    fontWeight: 700,
                    fontSize: { xs: 16, sm: 18 },
                    px: 0,
                    py: 0
                  }}
                >
                  {boletaEmpresa.nombre}
                </Box>
              </Box>

              <Box
                  className="boleta-top-row"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 230px' },
                    gap: 1.2,
                    mb: 1.2,
                    alignItems: 'start'
                  }}
                >
                <Box
                  className="boleta-empresa-box"
                  sx={{ p: 0.2, bgcolor: 'transparent', fontSize: { xs: 11, sm: 11 } }}
                >
                  <div><strong>RUC:</strong> {boletaEmpresa.ruc}</div>
                  <div><strong>Direccion:</strong> {boletaEmpresa.direccion}</div>
                  <div><strong>Telefono:</strong> {boletaEmpresa.telefono}</div>
                </Box>

                <Box className="boleta-doc-box" sx={{ border: '1px solid #6b7280', p: 0.6, bgcolor: 'transparent', textAlign: 'center' }}>
                  <Box className="doc-ruc" sx={{ borderBottom: '1px solid #7d8594', fontWeight: 700, fontSize: { xs: 11, sm: 11 }, mb: 0.4 }}>
                    R.U.C. {boletaEmpresa.ruc}
                  </Box>
                  <Box className="doc-type" sx={{ borderBottom: '1px solid #7d8594', bgcolor: '#b9e6b9', fontWeight: 800, fontSize: { xs: 18, sm: 16 }, mb: 0.4 }}>
                    BOLETA DE VENTA
                  </Box>
                  <Box
                    className="doc-num"
                    sx={{
                      display: 'block',
                      color: '#d40000',
                      fontWeight: 800,
                      fontSize: { xs: 16, sm: 14 },
                      px: 0
                    }}
                  >
                    {formatBoletaSerieNumero(ventaReciente)}
                  </Box>
                </Box>
              </Box>

              <Box
                className="boleta-mid-row"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 230px' },
                  gap: 0,
                  mb: 1.2
                }}
              >
                <Box
                  className="boleta-client-box"
                  sx={{ border: '1px solid #6b7280', p: 1, bgcolor: 'transparent', fontSize: { xs: 11, sm: 11 }, lineHeight: 1.25 }}
                >
                  <div><strong>CLIENTE:</strong> {clienteBoleta?.nombreCompleto || 'PUBLICO EN GENERAL'}</div>
                  <div><strong>DNI:</strong> {clienteBoleta?.dni || '-'}</div>
                  <div><strong>METODO DE PAGO:</strong> {formatMetodoPagoBoleta(ventaReciente.metodoPago)}</div>
                  <div><strong>ID DE VENTA:</strong> {ventaReciente.id}</div>
                  <div><strong>FECHA:</strong> {formatFechaBoleta(ventaReciente.fecha)}</div>
                </Box>

                <Box
                  className="boleta-logo-box"
                  sx={{
                    border: '1px solid #6b7280',
                    p: 1,
                    bgcolor: 'transparent',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: { xs: 120, sm: 150 }
                  }}
                >
                  <img
                    src={boletaEmpresa.logo}
                    alt="Logo Market"
                    style={{ maxWidth: '95%', maxHeight: 120, objectFit: 'contain' }}
                  />
                </Box>
              </Box>

              <Box
                className="boleta-section-title"
                sx={{
                  display: 'inline-block',
                  mb: 0.8,
                  color: '#0b8f16',
                  fontWeight: 800,
                  bgcolor: 'transparent',
                  px: 0,
                  fontSize: { xs: 16, sm: 14 }
                }}
              >
                DETALLE DE PRODUCTOS
              </Box>

              <table className="boleta-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #666', background: '#ececec', padding: '4px 6px', fontSize: 10 }}>Producto</th>
                    <th style={{ border: '1px solid #666', background: '#ececec', padding: '4px 6px', fontSize: 10, width: 70 }}>Cant.</th>
                    <th style={{ border: '1px solid #666', background: '#ececec', padding: '4px 6px', fontSize: 10, width: 120 }}>P. Unit.</th>
                    <th style={{ border: '1px solid #666', background: '#ececec', padding: '4px 6px', fontSize: 10, width: 120 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ventaReciente.productosVendidos.map((prod, idx) => {
                    const cantidad = prod.cantidad || 1;
                    const precioUnitario = prod.producto.precioVenta ?? 0;
                    const subtotal = precioUnitario * cantidad;
                    return (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #666', padding: '4px 6px', fontSize: 10 }}>{prod.producto.nombre}</td>
                        <td style={{ border: '1px solid #666', padding: '4px 6px', textAlign: 'center', fontSize: 10 }}>{cantidad}</td>
                        <td style={{ border: '1px solid #666', padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(precioUnitario)}</td>
                        <td style={{ border: '1px solid #666', padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <Box
                className="boleta-total-row"
                sx={{
                  mt: 1.2,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 1.2,
                  color: '#0b8f16',
                  fontWeight: 800,
                  fontSize: { xs: 18, sm: 13 }
                }}
              >
                <Box className="boleta-total-label" sx={{ px: 0 }}>
                  TOTAL A PAGAR:
                </Box>
                <Box className="boleta-total-value" sx={{ px: 0 }}>
                  {formatCurrency(getVentaTotal(ventaReciente))}
                </Box>
              </Box>

              <Box
                className="boleta-footer"
                sx={{
                  mt: 2,
                  mx: 'auto',
                  maxWidth: 280,
                  textAlign: 'center',
                  border: 'none',
                  bgcolor: 'transparent',
                  fontSize: { xs: 14, sm: 11 },
                  lineHeight: 1.2,
                  p: 0
                }}
              >
                <div>¡Gracias por su compra!</div>
                <div>Vuelva pronto</div>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setVentaReciente(null);
              setClienteBoleta(null);
            }}
            color="secondary"
          >
            Cerrar
          </Button>
          <Button onClick={() => imprimirBoleta()} color="primary" variant="contained" startIcon={<Print />}>Imprimir boleta</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default VentasPage; 
