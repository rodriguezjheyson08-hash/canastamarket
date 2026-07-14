/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/06-VentasPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { ShoppingCart, Add, Remove, Delete, Print, QrCodeScanner, Search, PointOfSale, CallMade, CallReceived } from '@mui/icons-material';
import QRCode from 'qrcode';
import { Producto, Venta, Categoria, VentaCreatePayload, CajaSesion, CajaFondoAsignado } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  createMercadoPagoPreference,
  createVenta,
  abrirCaja,
  cerrarCaja,
  getCajaActual,
  getCategorias,
  getConfiguracionSistema,
  getMercadoPagoPayment,
  getProductos,
  registrarMovimientoCaja
} from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClienteDniData, buscarClientePorDni } from '../apidni/dniService';
import { consultarRuc } from '../services/proveedores';
import { BOLETA_CONFIG_UPDATE_EVENT, BoletaConfig, loadBoletaConfig } from '../utils/boletaConfig';
import { VUELTO_CONFIG_UPDATE_EVENT, VueltoConfig, loadVueltoConfig, saveVueltoConfig } from '../utils/vueltoConfig';
import { saveVentaClienteInfo } from '../utils/ventasClienteMap';
import { saveVentaVendedorInfo } from '../utils/ventasVendedorMap';
import { useAuth } from '../contexts/AuthContext';
import {
  MP_MIN_AMOUNT,
  MP_PENDING_SALE_STORAGE_KEY,
  QR_YAPE,
  imagenesBebidas
} from '../features/ventas/constants';
import { CarritoItem, ClienteBoleta, MPPendingSale, TipoBoleta } from '../features/ventas/types';
import {
  blockInvalidNumberKey,
  buildSunatQrPayload,
  canUseMercadoPagoBackUrls,
  clampQuantity,
  formatBoletaSerieNumero as formatBoletaSerieNumeroUtil,
  formatCurrency,
  formatFechaBoleta,
  formatMetodoPagoBoleta,
  formatMoneyNumber,
  getBoletaHash as getBoletaHashUtil,
  getBoletaResumenTributario as getBoletaResumenTributarioUtil,
  montoEnLetras,
  normalizeDecimalInput,
  parseQuantityInput,
  readPendingSale
} from '../features/ventas/utils';
import {
  boletaRootStyles,
  carritoListaStyles,
  carritoPanelStyles,
  productoCardStyles,
  productoDescripcionStyles,
  productoImagenStyles,
  productoNombreStyles
} from '../features/ventas/styles';
import { fullWidthSnackbarStyles } from '../styles/buttons';
import { pageContainerStyles } from '../styles/layout';
import BarcodeScannerDialog from '../components/common/BarcodeScannerDialog';
import { filtrarProductosParaVentas } from '../utils/productFilters';

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
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'yape' | 'mercadopago' | 'mixto'>('efectivo');
  const [recibido, setRecibido] = useState('');
  const [vuelto, setVuelto] = useState(0);
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState('');
  const [montoYapeMixto, setMontoYapeMixto] = useState('');
  const [recibidoMixto, setRecibidoMixto] = useState('');
  const [cajaActual, setCajaActual] = useState<CajaSesion | null>(null);
  const [fondoCajaPendiente, setFondoCajaPendiente] = useState<CajaFondoAsignado | null>(null);
  const [cajaLoading, setCajaLoading] = useState(true);
  const [modalCaja, setModalCaja] = useState<'abrir' | 'cerrar' | null>(null);
  const [modalMovimientoCaja, setModalMovimientoCaja] = useState<'ENTRADA' | 'SALIDA' | null>(null);
  const [montoCaja, setMontoCaja] = useState('');
  const [montoMovimientoCaja, setMontoMovimientoCaja] = useState('');
  const [motivoMovimientoCaja, setMotivoMovimientoCaja] = useState('');
  const [tipoBoleta, setTipoBoleta] = useState<TipoBoleta>('boleta');
  const [tipoBoletaReciente, setTipoBoletaReciente] = useState<TipoBoleta>('boleta');
  const [boletaQrDataUrl, setBoletaQrDataUrl] = useState('');
  const [ventaReciente, setVentaReciente] = useState<Venta | null>(null);
  const [clienteBoleta, setClienteBoleta] = useState<ClienteBoleta | null>(null);
  const [dniCliente, setDniCliente] = useState('');
  const [nombresCliente, setNombresCliente] = useState('');
  const [apellidosCliente, setApellidosCliente] = useState('');
  const [rucCliente, setRucCliente] = useState('');
  const [razonSocialCliente, setRazonSocialCliente] = useState('');
  const [direccionFiscalCliente, setDireccionFiscalCliente] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [codigoBarrasScan, setCodigoBarrasScan] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [boletaEmpresa, setBoletaEmpresa] = useState<BoletaConfig>(() => loadBoletaConfig());
  const [vueltoConfig, setVueltoConfig] = useState<VueltoConfig>(() => loadVueltoConfig());
  const [mpLoading, setMpLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const mpPaymentLink = process.env.REACT_APP_MP_PAYMENT_LINK;
  const { user } = useAuth();
  const esCajero = String(user?.rol || '').toUpperCase() === 'CAJERO';
  const esAdmin = String(user?.rol || '').toUpperCase() === 'ADMINISTRADOR';
  const processedMpPaymentIdRef = useRef<string | null>(null);

  const vendedorPayload = useMemo(() => ({
    vendedorId: user?.id || null,
    vendedorUsuario: user?.nombreUsuario || null,
    vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
  }), [user?.id, user?.nombreCompleto, user?.nombreUsuario]);

  useEffect(() => {
    const refreshVueltoConfig = () => setVueltoConfig(loadVueltoConfig());
    window.addEventListener('storage', refreshVueltoConfig);
    window.addEventListener(VUELTO_CONFIG_UPDATE_EVENT, refreshVueltoConfig);
    if (!esCajero) {
      getConfiguracionSistema()
        .then((data) => {
          if (data.vueltos) setVueltoConfig(saveVueltoConfig(data.vueltos));
        })
        .catch(() => {
          // Si no se puede leer la configuracion remota, se conserva el dato local.
        });
    }
    return () => {
      window.removeEventListener('storage', refreshVueltoConfig);
      window.removeEventListener(VUELTO_CONFIG_UPDATE_EVENT, refreshVueltoConfig);
    };
  }, [esCajero]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchCajaActual = useCallback(async () => {
    try {
      const data = await getCajaActual();
      setCajaActual(data.caja);
      setFondoCajaPendiente(data.fondoPendiente);
    } catch (error) {
      setCajaActual(null);
      setFondoCajaPendiente(null);
      showSnackbar('No se pudo consultar el estado de caja', 'error');
    } finally {
      setCajaLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchCajaActual();
  }, [fetchCajaActual]);

  const fetchProductos = useCallback(async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      setProductos([]);
      showSnackbar('Error al cargar productos', 'error');
    }
  }, [showSnackbar]);

  const fetchCategorias = useCallback(async () => {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      setCategorias([]);
      showSnackbar('Error al cargar categorías', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
// LOGICA: reload Boleta Config concentra una operacion de este archivo.
    const reloadBoletaConfig = () => setBoletaEmpresa(loadBoletaConfig());
    globalThis.addEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
    globalThis.addEventListener('storage', reloadBoletaConfig);
    return () => {
      globalThis.removeEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
      globalThis.removeEventListener('storage', reloadBoletaConfig);
    };
  }, []);

  useEffect(() => {
// LOGICA: load Data concentra una operacion de este archivo.
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProductos(), fetchCategorias()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCategorias, fetchProductos]);


// LOGICA: reset Datos Cliente concentra una operacion de este archivo.
  const resetDatosCliente = () => {
    setDniCliente('');
    setNombresCliente('');
    setApellidosCliente('');
    setRucCliente('');
    setRazonSocialCliente('');
    setDireccionFiscalCliente('');
  };

  const normalizeCliente = useCallback((cliente: ClienteDniData | ClienteBoleta): ClienteBoleta => {
    const nombres = cliente.nombres?.trim() || '';
    const apellidos = cliente.apellidos?.trim() || '';
    const nombreCompleto = cliente.nombreCompleto?.trim() || [nombres, apellidos].filter(Boolean).join(' ').trim();
    const dni = (cliente.dni || '').trim();
    const ruc = ('ruc' in cliente ? cliente.ruc || '' : '').trim();
    const tipoDocumento = ('tipoDocumento' in cliente ? cliente.tipoDocumento : undefined) || (ruc ? '6' : '1');
    const numeroDocumento = ('numeroDocumento' in cliente ? cliente.numeroDocumento || '' : '').trim() || ruc || dni;
    return {
      tipoDocumento,
      numeroDocumento,
      dni,
      ruc,
      nombres,
      apellidos,
      nombreCompleto,
      razonSocial: 'razonSocial' in cliente ? cliente.razonSocial : undefined,
      direccion: 'direccion' in cliente ? cliente.direccion : undefined
    };
  }, []);

  const getClienteBoletaActual = (): ClienteBoleta | null => {
    if (tipoBoleta === 'factura') {
      const ruc = rucCliente.trim();
      const razonSocial = razonSocialCliente.trim();
      if (!ruc && !razonSocial) return null;
      return {
        tipoDocumento: '6',
        numeroDocumento: ruc,
        dni: '',
        ruc,
        nombres: '',
        apellidos: '',
        nombreCompleto: razonSocial,
        razonSocial,
        direccion: direccionFiscalCliente.trim()
      };
    }

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

  const isDniClienteValido = (dni: string) => /^\d{8}$/.test(dni.trim()) && !/^(\d)\1{7}$/.test(dni.trim());

  const documentoClienteValido = () => {
    if (tipoBoleta === 'factura') {
      return /^\d{11}$/.test(rucCliente.trim()) && razonSocialCliente.trim().length > 0;
    }
    return isDniClienteValido(dniCliente) && [nombresCliente, apellidosCliente].filter(Boolean).join(' ').trim().length > 0;
  };

  const buildClienteVentaPayload = useCallback((cliente: ClienteBoleta | null, comprobante: TipoBoleta = tipoBoleta) => {
    if (!cliente) {
      return {
        tipoComprobante: comprobante,
        clienteTipoDocumento: comprobante === 'factura' ? '6' : '1',
        clienteNumeroDocumento: null,
        clienteRuc: null,
        clienteDni: null,
        clienteNombre: null,
        clienteDireccion: null
      };
    }

    const numeroDocumento = cliente.numeroDocumento || cliente.ruc || cliente.dni || null;
    return {
      tipoComprobante: comprobante,
      clienteTipoDocumento: cliente.tipoDocumento || (comprobante === 'factura' ? '6' : '1'),
      clienteNumeroDocumento: numeroDocumento,
      clienteRuc: comprobante === 'factura' ? (cliente.ruc || numeroDocumento) : null,
      clienteDni: comprobante === 'boleta' ? (cliente.dni || numeroDocumento) : null,
      clienteNombre: cliente.razonSocial || cliente.nombreCompleto || null,
      clienteDireccion: cliente.direccion || null
    };
  }, [tipoBoleta]);

// LOGICA: handle Buscar Cliente Dni concentra una operacion de este archivo.
  const handleBuscarClienteDni = async () => {
    const dni = dniCliente.trim();
    if (!isDniClienteValido(dni)) {
      setNombresCliente('');
      setApellidosCliente('');
      showSnackbar('Ingresa un DNI valido de 8 digitos.', 'error');
      return;
    }

    try {
      setBuscandoCliente(true);
      const cliente = await buscarClientePorDni(dni);
      const normalized = normalizeCliente(cliente);
      if (!normalized.nombreCompleto && !normalized.nombres && !normalized.apellidos) {
        setNombresCliente('');
        setApellidosCliente('');
        showSnackbar('Ese DNI no fue encontrado en RENIEC.', 'error');
        return;
      }
      setDniCliente(normalized.dni);
      setNombresCliente(normalized.nombres);
      setApellidosCliente(normalized.apellidos);
      showSnackbar('Cliente encontrado', 'success');
    } catch (error: any) {
      setNombresCliente('');
      setApellidosCliente('');
      const rawMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Ese DNI no fue encontrado en RENIEC.';
      const message = String(rawMessage).trim().toLowerCase() === 'not found'
        ? 'Ese DNI no fue encontrado en RENIEC.'
        : rawMessage;
      showSnackbar(message, 'error');
    } finally {
      setBuscandoCliente(false);
    }
  };

// LOGICA: handle Buscar Cliente Ruc concentra una operacion de este archivo.
  const handleBuscarClienteRuc = async () => {
    const ruc = rucCliente.trim();
    if (!/^\d{11}$/.test(ruc)) {
      showSnackbar('Ingresa un RUC válido de 11 dígitos', 'error');
      return;
    }

    try {
      setBuscandoCliente(true);
      const data = await consultarRuc(ruc);
      const razonSocial =
        data?.razonSocial ||
        data?.razon_social ||
        data?.nombre ||
        data?.nombre_o_razon_social ||
        data?.data?.razonSocial ||
        data?.data?.razon_social ||
        '';
      const direccion =
        data?.direccion ||
        data?.domicilioFiscal ||
        data?.domicilio_fiscal ||
        data?.data?.direccion ||
        data?.data?.domicilioFiscal ||
        '';
      setRucCliente(ruc);
      setRazonSocialCliente(String(razonSocial || '').trim());
      setDireccionFiscalCliente(String(direccion || '').trim());
      showSnackbar('Empresa encontrada', 'success');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo consultar el RUC';
      showSnackbar(message, 'error');
    } finally {
      setBuscandoCliente(false);
    }
  };

  const agregarAlCarrito = useCallback((producto: Producto) => {
    if (producto.stockActual <= 0) return;
    setCarrito(prev => {
      const idx = prev.findIndex(item => item.producto.id === producto.id);
      if (idx >= 0) {
        const nuevo = [...prev];
        if (nuevo[idx].cantidad < producto.stockActual) {
          nuevo[idx].cantidad = clampQuantity(nuevo[idx].cantidad + 1, producto.stockActual);
        }
        return nuevo;
      } else {
        return [...prev, { producto, cantidad: 1 }];
      }
    });
  }, []);

  const buscarProductoExactoPorCodigo = useCallback((codigo: string) => {
    const normalized = codigo.trim();
    if (!normalized) return null;
    return productos.find(producto => producto.codigoBarras?.trim() === normalized) || null;
  }, [productos]);

  const agregarProductoEscaneado = useCallback((codigo: string) => {
    const producto = buscarProductoExactoPorCodigo(codigo);
    if (!producto) {
      if (codigo.trim()) {
        showSnackbar('No se encontró un producto con ese código de barras', 'error');
      }
      return;
    }
    if (producto.stockActual <= 0) {
      showSnackbar(`Sin stock para ${producto.nombre}`, 'error');
      return;
    }
    setCategoriaFiltro(0);
    setCodigoBarrasScan('');
    agregarAlCarrito(producto);
    showSnackbar(`${producto.nombre} agregado al carrito`, 'success');
  }, [agregarAlCarrito, buscarProductoExactoPorCodigo, showSnackbar]);

// LOGICA: handle Codigo Barras Key Down concentra una operacion de este archivo.
  const handleCodigoBarrasKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    agregarProductoEscaneado(codigoBarrasScan);
  };

  const handleCodigoDetectadoVenta = useCallback((codigo: string) => {
    const normalized = codigo.trim();
    agregarProductoEscaneado(normalized);
  }, [agregarProductoEscaneado]);

// LOGICA: quitar Del Carrito concentra una operacion de este archivo.
  const quitarDelCarrito = (productoId: number) => {
    setCarrito(prev => prev.filter(item => item.producto.id !== productoId));
  };

// LOGICA: cambiar Cantidad concentra una operacion de este archivo.
  const cambiarCantidad = (productoId: number, cantidad: number) => {
    setCarrito(prev => prev.map(item =>
      item.producto.id === productoId
        ? { ...item, cantidad: clampQuantity(cantidad, item.producto.stockActual) }
        : item
    ));
  };

  const limpiarCarrito = useCallback(() => setCarrito([]), []);

  const calcularTotal = useCallback(
    () => carrito.reduce((sum, item) => sum + item.producto.precioVenta * item.cantidad, 0),
    [carrito]
  );

  const efectivoMixto = Number.parseFloat(montoEfectivoMixto) || 0;
  const yapeMixto = Number.parseFloat(montoYapeMixto) || 0;
  const recibidoEfectivoMixto = Number.parseFloat(recibidoMixto) || 0;
  const totalMixto = Number((efectivoMixto + yapeMixto).toFixed(2));
  const vueltoMixto = Number(Math.max(0, recibidoEfectivoMixto - efectivoMixto).toFixed(2));
  const pagoMixtoValido = efectivoMixto > 0 &&
    yapeMixto > 0 &&
    Math.abs(totalMixto - calcularTotal()) <= 0.01 &&
    recibidoEfectivoMixto >= efectivoMixto;

  useEffect(() => {
    if (metodoPago === 'efectivo') {
      const rec = parseFloat(recibido);
      setVuelto(Number.isFinite(rec) && rec > 0 ? rec - calcularTotal() : 0);
    } else {
      setVuelto(0);
    }
  }, [recibido, metodoPago, calcularTotal]);

// LOGICA: handle Recibido Change concentra una operacion de este archivo.
  const handleRecibidoChange = (value: string) => {
    setRecibido(normalizeDecimalInput(value));
  };

  const guardarAperturaCaja = async () => {
    const monto = esCajero ? undefined : Number.parseFloat(montoCaja);
    if (!esCajero && (!Number.isFinite(Number(monto)) || Number(monto) < 0)) {
      showSnackbar('Ingresa un monto inicial válido', 'error');
      return;
    }
    try {
      setCajaLoading(true);
      const caja = await abrirCaja(monto);
      setCajaActual(caja);
      setFondoCajaPendiente(null);
      setModalCaja(null);
      setMontoCaja('');
      showSnackbar('Caja abierta correctamente', 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo abrir la caja', 'error');
    } finally {
      setCajaLoading(false);
    }
  };

  const guardarCierreCaja = async () => {
    const monto = Number.parseFloat(montoCaja);
    if (!Number.isFinite(monto) || monto < 0) {
      showSnackbar('Ingresa el efectivo contado en caja', 'error');
      return;
    }
    try {
      setCajaLoading(true);
      const cajaCerrada = await cerrarCaja(monto);
      setCajaActual(null);
      setModalCaja(null);
      setMontoCaja('');
      showSnackbar(
        `Caja cerrada. Diferencia: ${formatCurrency(cajaCerrada.diferencia || 0)}`,
        'success'
      );
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo cerrar la caja', 'error');
    } finally {
      setCajaLoading(false);
    }
  };

  const guardarMovimientoCaja = async () => {
    if (!modalMovimientoCaja) return;
    const monto = Number.parseFloat(montoMovimientoCaja);
    if (!Number.isFinite(monto) || monto <= 0) {
      showSnackbar('Ingresa un monto mayor a cero', 'error');
      return;
    }
    if (!motivoMovimientoCaja.trim()) {
      showSnackbar('Ingresa el motivo del movimiento de efectivo', 'error');
      return;
    }
    try {
      setCajaLoading(true);
      await registrarMovimientoCaja({
        tipo: modalMovimientoCaja,
        monto,
        motivo: motivoMovimientoCaja.trim()
      });
      const actual = await getCajaActual();
      setCajaActual(actual.caja);
      setFondoCajaPendiente(actual.fondoPendiente);
      setModalMovimientoCaja(null);
      setMontoMovimientoCaja('');
      setMotivoMovimientoCaja('');
      showSnackbar(
        modalMovimientoCaja === 'ENTRADA' ? 'Entrada de efectivo registrada' : 'Salida de efectivo registrada',
        'success'
      );
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo registrar el movimiento de caja', 'error');
    } finally {
      setCajaLoading(false);
    }
  };

// LOGICA: efectivo Es Insuficiente concentra una operacion de este archivo.
  const efectivoEsInsuficiente = () => {
    const rec = parseFloat(recibido);
    return !Number.isFinite(rec) || rec < calcularTotal();
  };

  const clearPendingSale = useCallback(() => {
    globalThis.localStorage.removeItem(MP_PENDING_SALE_STORAGE_KEY);
  }, []);

// LOGICA: payment Amount Matches concentra una operacion de este archivo.
  const paymentAmountMatches = (expected: number, paid?: number) =>
    Number.isFinite(Number(paid)) && Math.abs(Number(paid) - Number(expected || 0)) <= 0.01;

  const registrarVentaDesdePagoPendiente = useCallback(async (pending: MPPendingSale | null) => {
    if (!pending || !Array.isArray(pending.items) || pending.items.length === 0) {
      throw new Error('Pago aprobado pero no se encontró venta pendiente.');
    }

    const venta = await createVenta({
      productosVendidos: pending.items,
      total: pending.total,
      metodoPago: 'mercadopago',
      recibido: pending.total,
      vuelto: 0,
      ...buildClienteVentaPayload(pending.cliente || null, pending.tipoBoleta || 'boleta'),
      ...vendedorPayload
    });

    saveVentaClienteInfo(venta.id, {
      clienteNombre: pending?.cliente?.razonSocial || pending?.cliente?.nombreCompleto || null,
      clienteDni: pending?.tipoBoleta === 'factura' ? null : (pending?.cliente?.dni || pending?.cliente?.numeroDocumento || null)
    });
    saveVentaVendedorInfo(venta.id, {
      vendedorId: vendedorPayload.vendedorId,
      vendedorUsuario: vendedorPayload.vendedorUsuario,
      vendedorNombre: vendedorPayload.vendedorNombre
    });

    clearPendingSale();
    setVentaReciente(venta);
    setTipoBoletaReciente(pending.tipoBoleta || 'boleta');
    setClienteBoleta(pending.cliente ? normalizeCliente(pending.cliente) : null);
    limpiarCarrito();
    await fetchProductos();
    globalThis.dispatchEvent(new Event('ventaRealizada'));
  }, [buildClienteVentaPayload, clearPendingSale, fetchProductos, limpiarCarrito, normalizeCliente, vendedorPayload]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentId = params.get('payment_id') || params.get('collection_id');
    if (!paymentId) return;
    if (processedMpPaymentIdRef.current === paymentId) return;
    processedMpPaymentIdRef.current = paymentId;

// LOGICA: finalize Mercado Pago concentra una operacion de este archivo.
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
  }, [location.search, location.pathname, navigate, registrarVentaDesdePagoPendiente, showSnackbar]);

// LOGICA: finalizar Venta concentra una operacion de este archivo.
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
        ...(metodoPago === 'mixto' ? {
          pagos: [
            {
              metodo: 'efectivo',
              monto: efectivoMixto,
              recibido: recibidoEfectivoMixto,
              vuelto: vueltoMixto
            },
            { metodo: 'yape', monto: yapeMixto, recibido: yapeMixto, vuelto: 0 }
          ]
        } : {}),
        ...buildClienteVentaPayload(clienteActual),
        ...vendedorPayload
      };
      const nuevaVenta = await createVenta(ventaData);
      saveVentaClienteInfo(nuevaVenta.id, {
        clienteNombre: clienteActual?.razonSocial || clienteActual?.nombreCompleto || null,
        clienteDni: tipoBoleta === 'factura' ? null : (clienteActual?.dni || clienteActual?.numeroDocumento || null)
      });
      saveVentaVendedorInfo(nuevaVenta.id, {
        vendedorId: user?.id || null,
        vendedorUsuario: user?.nombreUsuario || null,
        vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
      });
      clearPendingSale();
      setVentaReciente(nuevaVenta);
      setTipoBoletaReciente(tipoBoleta);
      setClienteBoleta(clienteActual);
      showSnackbar('Venta realizada exitosamente', 'success');
      limpiarCarrito();
      await fetchProductos();
      globalThis.dispatchEvent(new Event('ventaRealizada'));
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al guardar venta';
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
    }
  };

// LOGICA: iniciar Pago Mercado Pago concentra una operacion de este archivo.
  const iniciarPagoMercadoPago = async () => {
    if (carrito.length === 0) return;
    if (calcularTotal() < MP_MIN_AMOUNT) {
      showSnackbar(`Mercado Pago requiere un monto mínimo de ${formatCurrency(MP_MIN_AMOUNT)}.`, 'error');
      return;
    }
    setMpLoading(true);
    try {
      if (mpPaymentLink) {
        globalThis.location.assign(mpPaymentLink);
        return;
      }

      const items = carrito.map(item => ({
        title: item.producto.nombre,
        quantity: item.cantidad,
        unit_price: Number(item.producto.precioVenta || 0)
      }));
      const origin = globalThis.location.origin;
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
        externalReference,
        tipoBoleta
      };
      globalThis.localStorage.setItem(MP_PENDING_SALE_STORAGE_KEY, JSON.stringify(pendingPayload));
      setModalPago(false);
      globalThis.location.assign(initPoint);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al generar pago con Mercado Pago';
      const details = error?.response?.data?.details;
      const detailText = details ? ` (${JSON.stringify(details)})` : '';
      showSnackbar(`${message}${detailText}`, 'error');
    } finally {
      setMpLoading(false);
    }
  };

// LOGICA: registrar Venta Manual concentra una operacion de este archivo.
  const registrarVentaManual = async () => {
    if (carrito.length === 0) return;
    if (!documentoClienteValido()) {
      showSnackbar(
        tipoBoleta === 'factura'
          ? 'Para factura electrónica ingresa un RUC válido y la razón social.'
          : 'Para boleta electrónica ingresa un DNI válido y el nombre del cliente.',
        'error'
      );
      return;
    }
    const confirmPaid = globalThis.confirm(
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
        ...buildClienteVentaPayload(clienteActual),
        ...vendedorPayload
      });
      saveVentaClienteInfo(venta.id, {
        clienteNombre: clienteActual?.razonSocial || clienteActual?.nombreCompleto || null,
        clienteDni: tipoBoleta === 'factura' ? null : (clienteActual?.dni || clienteActual?.numeroDocumento || null)
      });
      saveVentaVendedorInfo(venta.id, {
        vendedorId: user?.id || null,
        vendedorUsuario: user?.nombreUsuario || null,
        vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
      });
      clearPendingSale();
      setVentaReciente(venta);
      setTipoBoletaReciente(tipoBoleta);
      setClienteBoleta(clienteActual);
      limpiarCarrito();
      await fetchProductos();
      setModalPago(false);
      resetDatosCliente();
      globalThis.dispatchEvent(new Event('ventaRealizada'));
      showSnackbar('Venta registrada manualmente', 'success');
    } catch (error) {
      showSnackbar('No se pudo registrar la venta', 'error');
    } finally {
      setSaving(false);
    }
  };

// LOGICA: format Boleta Serie Numero concentra una operacion de este archivo.
  const formatBoletaSerieNumero = (venta: Venta, tipo: TipoBoleta = tipoBoletaReciente) => {
    return formatBoletaSerieNumeroUtil(venta, boletaEmpresa, tipo);
  };

// LOGICA: get Boleta Resumen Tributario concentra una operacion de este archivo.
  const getBoletaResumenTributario = (venta: Venta) => {
    return getBoletaResumenTributarioUtil(venta, tipoBoletaReciente);
  };

// LOGICA: get Boleta Hash concentra una operacion de este archivo.
  const getBoletaHash = (venta: Venta) => {
    return getBoletaHashUtil(venta, boletaEmpresa, tipoBoletaReciente, clienteBoleta);
  };

  const boletaQrPayload = ventaReciente
    ? buildSunatQrPayload(ventaReciente, boletaEmpresa, tipoBoletaReciente, clienteBoleta)
    : '';

  useEffect(() => {
    if (!boletaQrPayload) {
      setBoletaQrDataUrl('');
      return;
    }

    let active = true;
    QRCode.toDataURL(boletaQrPayload, {
      errorCorrectionLevel: 'Q',
      margin: 1,
      width: 160
    })
      .then((url) => {
        if (active) setBoletaQrDataUrl(url);
      })
      .catch(() => {
        if (active) setBoletaQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [boletaQrPayload]);

// LOGICA: handle Finalizar Venta concentra una operacion de este archivo.
  const handleFinalizarVenta = () => {
    if (!cajaActual) {
      showSnackbar('Debes abrir tu caja antes de registrar una venta', 'error');
      setMontoCaja('');
      setModalCaja('abrir');
      return;
    }
    resetDatosCliente();
    setModalPago(true);
  };

// LOGICA: handle Confirmar Venta concentra una operacion de este archivo.
  const handleConfirmarVenta = async () => {
    if (!documentoClienteValido()) {
      showSnackbar(
        tipoBoleta === 'factura'
          ? 'Para factura electrónica ingresa un RUC válido y la razón social.'
          : 'Para boleta electrónica ingresa un DNI válido y el nombre del cliente.',
        'error'
      );
      return;
    }
    if (metodoPago === 'mercadopago') {
      await iniciarPagoMercadoPago();
      return;
    }
    if (metodoPago === 'efectivo' && efectivoEsInsuficiente()) {
      showSnackbar('El monto recibido es insuficiente', 'error');
      return;
    }
    if (metodoPago === 'mixto' && !pagoMixtoValido) {
      showSnackbar('Los montos de efectivo y Yape deben sumar exactamente el total', 'error');
      return;
    }
    await finalizarVenta();
    setModalPago(false);
    setMetodoPago('efectivo');
    setRecibido('');
    setVuelto(0);
    setMontoEfectivoMixto('');
    setMontoYapeMixto('');
    setRecibidoMixto('');
    await fetchCajaActual();
    resetDatosCliente();
  };

  const categoriaNombrePorId = useMemo(() => categorias.reduce<Record<number, string>>((acc, cat) => {
    acc[cat.id] = cat.nombre;
    return acc;
  }, {}), [categorias]);

  const productosFiltrados = useMemo(() => {
    // Prueba unitaria: src/utils/productFilters.test.ts valida busqueda por texto,
    // filtro por categoria y prioridad del codigo exacto al escanear en Ventas.
    return filtrarProductosParaVentas(productos, codigoBarrasScan, categoriaFiltro, categoriaNombrePorId);
  }, [categoriaFiltro, categoriaNombrePorId, codigoBarrasScan, productos]);

// LOGICA: render Boleta Impresion concentra una operacion de este archivo.
  const renderBoletaImpresion = (venta: Venta) => {
    const resumen = getBoletaResumenTributario(venta);
    const esFactura = tipoBoletaReciente === 'factura';
    const esElectronica = true;
    const usarFormatoTicket = false;
    const clienteNombre = clienteBoleta?.razonSocial || clienteBoleta?.nombreCompleto || venta.clienteNombre || (esFactura ? 'RAZON SOCIAL CLIENTE' : 'PUBLICO GENERAL');
    const clienteDocumento = clienteBoleta?.numeroDocumento || clienteBoleta?.ruc || clienteBoleta?.dni || venta.clienteDni || (esFactura ? '00000000000' : '00000000');
    const hash = getBoletaHash(venta);
    const totalItems = venta.productosVendidos.reduce((sum, item) => sum + Math.max(1, item.cantidad || 1), 0);
    const ticketSeparator = '------------------------------------------------';
    const ticketLogoSrc = (boletaEmpresa.logo || '').replace(/%20/g, ' ');

    if (!usarFormatoTicket) {
      return (
        <Box
          id="boleta-print"
          className="simple-invoice"
          sx={{
            ...boletaRootStyles,
            width: '100%',
            maxWidth: 560,
            mx: 'auto',
            p: { xs: 1.5, sm: 2 },
            color: '#111',
            bgcolor: '#fff',
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}
        >
          <Box className="simple-header" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 170px' }, gap: 1.5, alignItems: 'start' }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box>
                <Typography component="h1" sx={{ m: 0, fontSize: 20, fontWeight: 900, textTransform: 'uppercase' }}>
                  {boletaEmpresa.nombre}
                </Typography>
                <Typography component="div" sx={{ fontSize: 11 }}>RUC: {boletaEmpresa.ruc || '-'}</Typography>
                <Typography component="div" sx={{ fontSize: 11 }}>{boletaEmpresa.direccion || '-'}</Typography>
                <Typography component="div" sx={{ fontSize: 11 }}>Tel: {boletaEmpresa.telefono || '-'}</Typography>
              </Box>
            </Box>
            <Box className="simple-doc-box" sx={{ border: '1.5px solid #111', p: 1, textAlign: 'center' }}>
              <Typography component="div" sx={{ fontSize: 10 }}>
                RUC: {boletaEmpresa.ruc || '-'}
              </Typography>
              <Typography component="div" sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
                {esFactura ? 'Factura electronica' : 'Boleta de venta electronica'}
              </Typography>
              <Typography component="div" sx={{ mt: 0.25, fontSize: 13, fontWeight: 900 }}>
                {formatBoletaSerieNumero(venta, tipoBoletaReciente)}
              </Typography>
            </Box>
          </Box>

          <Box className="simple-info" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5, borderTop: '1px solid #111', borderBottom: '1px solid #111', py: 1, my: 1.5, fontSize: 11 }}>
            <div><strong>Fecha:</strong> {formatFechaBoleta(venta.fecha)}</div>
            <div><strong>Pago:</strong> {formatMetodoPagoBoleta(venta.metodoPago)}</div>
            {venta.pagos && venta.pagos.length > 1 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Detalle:</strong> {venta.pagos.map((pago) => `${formatMetodoPagoBoleta(pago.metodo)} ${formatCurrency(pago.monto)}`).join(' + ')}
              </div>
            )}
            <div><strong>{esFactura ? 'Razon social' : 'Cliente'}:</strong> {clienteNombre}</div>
            <div><strong>{esFactura ? 'RUC' : 'DNI'}:</strong> {clienteDocumento}</div>
            {esFactura && clienteBoleta?.direccion && (
              <div style={{ gridColumn: '1 / -1' }}><strong>Direccion fiscal:</strong> {clienteBoleta.direccion}</div>
            )}
          </Box>

          <table className="simple-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th colSpan={6} style={{ background: '#000', color: '#fff', textAlign: 'left', padding: '5px 6px', fontSize: 10 }}>{esFactura ? 'DETALLES DE LA FACTURA' : 'DETALLES DE LA BOLETA'}</th>
              </tr>
              <tr>
                <th style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '5px 4px', fontSize: 10, width: 42 }}>Cant.</th>
                <th style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '5px 4px', fontSize: 10, width: 48 }}>Unid.</th>
                <th style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '5px 4px', fontSize: 10, width: 70 }}>Codigo</th>
                <th style={{ background: '#000', color: '#fff', textAlign: 'left', padding: '5px 4px', fontSize: 10 }}>Descripcion</th>
                <th style={{ background: '#000', color: '#fff', textAlign: 'right', padding: '5px 4px', fontSize: 10, width: 76 }}>P. Unit.</th>
                <th style={{ background: '#000', color: '#fff', textAlign: 'right', padding: '5px 4px', fontSize: 10, width: 70 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {venta.productosVendidos.map((prod, idx) => {
                const cantidad = Math.max(1, prod.cantidad || 1);
                const precioUnitario = prod.producto.precioVenta ?? 0;
                const subtotal = precioUnitario * cantidad;
                const codigo = prod.producto.codigoBarras || `PROD-${String(prod.producto.id).padStart(3, '0')}`;
                return (
                  <tr key={idx}>
                    <td style={{ borderBottom: '1px solid #ddd', padding: '5px 4px', textAlign: 'center', fontSize: 10 }}>{cantidad}</td>
                    <td style={{ borderBottom: '1px solid #ddd', padding: '5px 4px', textAlign: 'center', fontSize: 10 }}>NIU</td>
                    <td style={{ borderBottom: '1px solid #ddd', padding: '5px 4px', textAlign: 'center', fontSize: 10 }}>{codigo}</td>
                    <td style={{ borderBottom: '1px solid #ddd', padding: '5px 4px', fontSize: 10 }}>{prod.producto.nombre}</td>
                    <td style={{ borderBottom: '1px solid #ddd', padding: '5px 4px', textAlign: 'right', fontSize: 10 }}>{formatMoneyNumber(precioUnitario)}</td>
                    <td style={{ borderBottom: '1px solid #ddd', padding: '5px 4px', textAlign: 'right', fontSize: 10, fontWeight: 700 }}>{formatMoneyNumber(subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Box className="simple-summary" sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
            <Box sx={{ width: { xs: '100%', sm: 220 }, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Items:</span><strong>{totalItems}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#000', color: '#fff', padding: 6, fontSize: 13, fontWeight: 900 }}>
                <span>IMPORTE TOTAL:</span><span>{formatCurrency(resumen.total)}</span>
              </div>
            </Box>
          </Box>

          <Box className="simple-words" sx={{ mt: 1.5, p: 0.75, border: '1px solid #111', fontSize: 10, fontWeight: 700 }}>
            {montoEnLetras(resumen.total)}
          </Box>
          <Box className="simple-tax" sx={{ mt: 0.75, textAlign: 'right', fontSize: 9.5, color: '#444' }}>
            Op. Gravada: S/ {formatMoneyNumber(resumen.opGravada)} | IGV (18%): S/ {formatMoneyNumber(resumen.igv)} | Hash: {hash}
          </Box>
          <Box className="simple-footer" sx={{ mt: 2, textAlign: 'center', fontSize: 10 }}>
            <div>Representación impresa de {esFactura ? 'factura electrónica' : 'boleta electrónica'}</div>
            Gracias por su compra
          </Box>
        </Box>
      );
    }

    return (
      <Box
        id="boleta-print"
        className="ticket-boleta"
        sx={{
          ...boletaRootStyles,
          width: 302,
          maxWidth: '100%',
          mx: 'auto',
          p: 1.4,
          color: '#111',
          bgcolor: '#fff',
          fontFamily: 'Consolas, "Courier New", monospace'
        }}
      >
        <Box className="ticket-header" sx={{ textAlign: 'center' }}>
          {ticketLogoSrc && (
            <img
              className="ticket-logo"
              src={ticketLogoSrc}
              alt={boletaEmpresa.nombre}
              style={{ maxWidth: 82, maxHeight: 52, objectFit: 'contain', marginBottom: 6 }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <Typography component="h1" sx={{ m: 0, fontSize: 15, fontWeight: 900, lineHeight: 1.12, textTransform: 'uppercase' }}>
            {boletaEmpresa.nombre}
          </Typography>
          <Typography component="div" sx={{ fontSize: 10.5, lineHeight: 1.25 }}>
            RUC: {boletaEmpresa.ruc || '-'}
          </Typography>
          <Typography component="div" sx={{ fontSize: 10.5, lineHeight: 1.25, textTransform: 'uppercase' }}>
            {boletaEmpresa.direccion || '-'}
          </Typography>
          <Typography component="div" sx={{ fontSize: 10.5, lineHeight: 1.25 }}>
            Tel: {boletaEmpresa.telefono || '-'}
          </Typography>
        </Box>

        <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
          {ticketSeparator}
        </Box>

        <Box className="ticket-doc" sx={{ textAlign: 'center' }}>
          <Typography component="div" sx={{ fontSize: 12.5, fontWeight: 900, lineHeight: 1.2 }}>
            {esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}
          </Typography>
          <Typography component="div" sx={{ mt: 0.4, fontSize: 12, fontWeight: 900, lineHeight: 1.2 }}>
            {formatBoletaSerieNumero(venta, tipoBoletaReciente)}
          </Typography>
        </Box>

        <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
          {ticketSeparator}
        </Box>

        <Box className="ticket-info" sx={{ fontSize: 10, lineHeight: 1.35 }}>
          <div><strong>Fecha:</strong> {formatFechaBoleta(venta.fecha)}</div>
          <div><strong>Cliente:</strong> {clienteNombre}</div>
          <div><strong>Doc.:</strong> {clienteDocumento}</div>
          <div><strong>Pago:</strong> {formatMetodoPagoBoleta(venta.metodoPago)}</div>
          {venta.pagos && venta.pagos.length > 1 && (
            <div><strong>Detalle:</strong> {venta.pagos.map((pago) => `${formatMetodoPagoBoleta(pago.metodo)} ${formatCurrency(pago.monto)}`).join(' + ')}</div>
          )}
          <div><strong>Moneda:</strong> SOL</div>
        </Box>

        <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
          {ticketSeparator}
        </Box>

        <table className="ticket-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 9.5, padding: '2px 0' }}>Producto</th>
              <th style={{ textAlign: 'center', fontSize: 9.5, padding: '2px 0', width: 30 }}>Cant</th>
              <th style={{ textAlign: 'right', fontSize: 9.5, padding: '2px 0', width: 48 }}>P.U.</th>
              <th style={{ textAlign: 'right', fontSize: 9.5, padding: '2px 0', width: 52 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.productosVendidos.map((prod, idx) => {
              const cantidad = Math.max(1, prod.cantidad || 1);
              const precioUnitario = prod.producto.precioVenta ?? 0;
              const subtotal = precioUnitario * cantidad;
              const codigo = prod.producto.codigoBarras || `PROD-${String(prod.producto.id).padStart(3, '0')}`;
              return (
                <tr key={idx}>
                  <td style={{ fontSize: 9.5, padding: '3px 2px 3px 0', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{prod.producto.nombre}</div>
                    <div style={{ fontSize: 8.5, color: '#333' }}>Cod: {codigo}</div>
                  </td>
                  <td style={{ fontSize: 9.5, padding: '3px 0', textAlign: 'center', verticalAlign: 'top' }}>{cantidad}</td>
                  <td style={{ fontSize: 9.5, padding: '3px 0', textAlign: 'right', verticalAlign: 'top' }}>{formatMoneyNumber(precioUnitario)}</td>
                  <td style={{ fontSize: 9.5, padding: '3px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>{formatMoneyNumber(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
          {ticketSeparator}
        </Box>

        <Box className="ticket-totals" sx={{ fontSize: 10, lineHeight: 1.45 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Items:</span><strong>{totalItems}</strong>
          </div>
          {esElectronica && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Op. Gravada:</span><span>{formatMoneyNumber(resumen.opGravada)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>IGV (18%):</span><span>{formatMoneyNumber(resumen.igv)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Op. Inafecta:</span><span>{formatMoneyNumber(resumen.opInafecta)}</span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 14, fontWeight: 900 }}>
            <span>TOTAL:</span><span>{formatCurrency(resumen.total)}</span>
          </div>
        </Box>

        <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
          {ticketSeparator}
        </Box>

        <Box className="ticket-amount-words" sx={{ fontSize: 9, fontWeight: 700, lineHeight: 1.25 }}>
          {montoEnLetras(resumen.total)}
        </Box>

        <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
          {ticketSeparator}
        </Box>

        {esElectronica ? (
          <>
            <Box className="ticket-hash" sx={{ fontSize: 8.2, lineHeight: 1.3, wordBreak: 'break-all' }}>
              <div>Representación impresa de {esFactura ? 'la Factura Electrónica' : 'la Boleta de Venta Electrónica'}</div>
              <div>Hash: {hash}</div>
            </Box>

            <Box className="ticket-qr-wrap" sx={{ textAlign: 'center', my: 1.2 }}>
              <Box className="ticket-qr-box" sx={{ display: 'inline-flex', width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
                {boletaQrDataUrl ? (
                  <img src={boletaQrDataUrl} alt={esFactura ? 'Código QR de factura electrónica' : 'Código QR de boleta electrónica'} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Typography variant="caption" color="text.secondary">Generando QR...</Typography>
                )}
              </Box>
              <Typography component="div" sx={{ mt: 0.5, fontSize: 8.5 }}>
                Código QR de consulta
              </Typography>
            </Box>

            <Box className="ticket-separator" sx={{ my: 0.9, fontSize: 10, lineHeight: 1, whiteSpace: 'pre', overflow: 'hidden' }}>
              {ticketSeparator}
            </Box>

            <Box className="ticket-footer" sx={{ textAlign: 'center', fontSize: 8.4, lineHeight: 1.35 }}>
              <div>Consulte su documento en SUNAT</div>
              <div>e-consulta.sunat.gob.pe</div>
            </Box>
          </>
        ) : (
          <Box className="ticket-footer" sx={{ textAlign: 'center', fontSize: 8.4, lineHeight: 1.35 }}>
            <div>Representación impresa de boleta electrónica</div>
            <div>Gracias por su compra</div>
          </Box>
        )}
      </Box>
    );
  };

  // Función para imprimir solo la boleta
// LOGICA: imprimir Boleta concentra una operacion de este archivo.
  const imprimirBoleta = () => {
    const printContents = globalThis.document.getElementById('boleta-print')?.outerHTML;
    if (!printContents) return;
    const boletaNumero = ventaReciente ? formatBoletaSerieNumero(ventaReciente) : 'SIN-NUMERO';
    const printTitle = `${tipoBoletaReciente === 'factura' ? 'Factura Electrónica' : 'Boleta Electrónica'} ${boletaNumero}`;
    const esElectronica = false;
    const win = globalThis.open('', '', esElectronica ? 'width=420,height=900' : 'width=760,height=900');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${printTitle}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              font-family: Consolas, "Courier New", monospace;
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
            .ticket-boleta {
              width: 74mm;
              max-width: 74mm;
              margin: 0 auto;
              padding: 0;
              background: #fff;
              color: #111;
              font-family: Consolas, "Courier New", monospace;
            }
            .ticket-header {
              text-align: center;
            }
            .ticket-logo {
              display: block;
              max-width: 22mm;
              max-height: 16mm;
              object-fit: contain;
              margin: 0 auto 2mm;
            }
            .ticket-header h1 {
              margin: 0;
              font-size: 10pt;
              font-weight: 800;
              line-height: 1.15;
              text-transform: uppercase;
            }
            .ticket-header div {
              font-size: 7.5pt;
              line-height: 1.25;
            }
            .ticket-doc {
              text-align: center;
            }
            .ticket-doc div:first-child {
              font-size: 8.6pt;
              font-weight: 800;
              text-transform: uppercase;
            }
            .ticket-doc div:last-child {
              font-size: 8pt;
              font-weight: 700;
            }
            .ticket-divider {
              border-top: 1px dashed #111;
              margin: 2.2mm 0;
            }
            .ticket-separator {
              margin: 2mm 0;
              font-size: 7pt;
              line-height: 1;
              white-space: pre;
              overflow: hidden;
            }
            .ticket-info {
              font-size: 7.3pt;
              line-height: 1.3;
            }
            .ticket-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .ticket-table th {
              border-bottom: 1px dashed #111;
              padding: 1mm 0;
              font-size: 7pt;
              font-weight: 700;
            }
            .ticket-table td {
              border: 0;
              padding: 1mm 0;
              font-size: 7pt;
              vertical-align: top;
              overflow-wrap: anywhere;
            }
            .ticket-table td:first-child {
              padding-right: 1.5mm;
            }
            .ticket-totals {
              font-size: 7.6pt;
              line-height: 1.35;
            }
            .ticket-totals div {
              display: flex;
              justify-content: space-between;
              gap: 3mm;
            }
            .ticket-totals div:last-child {
              margin-top: 1mm;
              font-size: 10pt;
              font-weight: 800;
            }
            .ticket-amount-words {
              border-top: 1px dashed #111;
              border-bottom: 1px dashed #111;
              padding: 1.5mm 0;
              margin: 2mm 0;
              font-size: 6.8pt;
              font-weight: 700;
            }
            .ticket-hash {
              font-size: 6.2pt;
              line-height: 1.25;
              word-break: break-all;
            }
            .ticket-qr-wrap {
              text-align: center;
              margin: 2mm 0;
            }
            .ticket-qr-box {
              display: inline-flex;
              width: 28mm;
              height: 28mm;
              align-items: center;
              justify-content: center;
            }
            .ticket-qr-box img {
              width: 100%;
              height: 100%;
            }
            .ticket-footer {
              border-top: 1px dashed #111;
              padding-top: 2mm;
              text-align: center;
              font-size: 6.8pt;
              line-height: 1.35;
            }
            @media print {
              body {
                width: 80mm;
              }
            }
            ${!esElectronica ? `
            @page { size: A4; margin: 12mm; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              width: auto;
            }
            @media print {
              body {
                width: auto;
              }
            }
            .simple-invoice {
              width: 100%;
              max-width: 150mm;
              margin: 0 auto;
              padding: 0;
              background: #fff;
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
            }
            .simple-header {
              display: grid;
              grid-template-columns: 1fr 45mm;
              gap: 5mm;
              align-items: start;
            }
            .simple-logo {
              width: 22mm;
              height: 22mm;
              object-fit: contain;
            }
            .simple-doc-box {
              border: 1.5px solid #111;
              padding: 3mm;
              text-align: center;
            }
            .simple-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2mm;
              border-top: 1px solid #111;
              border-bottom: 1px solid #111;
              padding: 3mm 0;
              margin: 5mm 0;
              font-size: 8.5pt;
            }
            .simple-table {
              width: 100%;
              border-collapse: collapse;
            }
            .simple-table th {
              border-bottom: 2px solid #111;
              padding: 1.8mm 1mm;
              font-size: 8pt;
            }
            .simple-table td {
              border-bottom: 1px solid #ddd;
              padding: 1.8mm 1mm;
              font-size: 8pt;
              vertical-align: top;
            }
            .simple-summary {
              display: flex;
              justify-content: flex-end;
              margin-top: 5mm;
            }
            .simple-summary > div {
              width: 58mm;
            }
            .simple-words {
              margin-top: 5mm;
              padding: 2mm;
              border: 1px solid #111;
              font-size: 8pt;
              font-weight: 700;
            }
            .simple-footer {
              margin-top: 7mm;
              text-align: center;
              font-size: 8pt;
            }
            ` : ''}
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
    <Container maxWidth="xl" sx={pageContainerStyles}>
      <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <PointOfSale color={cajaActual ? 'success' : 'warning'} />
            <Box>
              <Typography fontWeight="bold">
                {cajaLoading ? 'Consultando caja...' : cajaActual ? 'Caja abierta' : 'Caja cerrada'}
              </Typography>
              {cajaActual && (
                <Typography variant="body2" color="text.secondary">
                  Fondo base: {formatCurrency(cajaActual.montoInicial)} / Efectivo ventas: {formatCurrency(cajaActual.efectivoVentas ?? 0)} / Entradas: {formatCurrency(cajaActual.entradasEfectivo ?? 0)} / Salidas: {formatCurrency(cajaActual.salidasEfectivo ?? 0)} / Entregar admin: {formatCurrency(cajaActual.efectivoAEntregar ?? 0)}
                </Typography>
              )}
              {!cajaActual && fondoCajaPendiente && (
                <Typography variant="body2" color="success.main">
                  Fondo asignado por admin: {formatCurrency(fondoCajaPendiente.monto)}
                </Typography>
              )}
            </Box>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {cajaActual && esAdmin && (
              <>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CallReceived />}
                  disabled={cajaLoading}
                  onClick={() => setModalMovimientoCaja('ENTRADA')}
                >
                  Entrada
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CallMade />}
                  disabled={cajaLoading}
                  onClick={() => setModalMovimientoCaja('SALIDA')}
                >
                  Salida
                </Button>
              </>
            )}
            <Button
              variant="contained"
              color={cajaActual ? 'warning' : 'success'}
              disabled={cajaLoading}
              onClick={() => {
                setMontoCaja(cajaActual ? String(cajaActual.montoEsperado.toFixed(2)) : (fondoCajaPendiente ? String(fondoCajaPendiente.monto.toFixed(2)) : (esCajero ? 'automatico' : '')));
                setModalCaja(cajaActual ? 'cerrar' : 'abrir');
              }}
            >
              {cajaActual ? 'Cerrar caja' : 'Abrir caja'}
            </Button>
          </Stack>
        </Box>
        {!cajaLoading && !cajaActual && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {esCajero && !fondoCajaPendiente
              ? 'Se reutilizara el ultimo fondo base de tu caja. Si es tu primera apertura, el administrador debe asignarlo una sola vez.'
              : 'Debes abrir tu caja para poder registrar ventas.'}
          </Alert>
        )}
      </Card>
      <Grid container spacing={4}>
        {/* Columna de productos (80%) */}
        <Grid item xs={12} md={9} lg={9}>
          <Box
            sx={{
              mb: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 240px' },
              gap: 1.5,
              alignItems: 'flex-start'
            }}
          >
            <TextField
              label="Buscar producto o escanear código"
              value={codigoBarrasScan}
              onChange={(event) => setCodigoBarrasScan(event.target.value)}
              onKeyDown={handleCodigoBarrasKeyDown}
              fullWidth
              autoComplete="off"
              inputProps={{ enterKeyHint: 'search' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setScannerOpen(true)}
                      aria-label="Escanear con cámara"
                    >
                      <QrCodeScanner />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              
            />
            <FormControl fullWidth>
              <InputLabel id="categoria-ventas-label">Categoría</InputLabel>
              <Select
                labelId="categoria-ventas-label"
                value={categoriaFiltro}
                label="Categoría"
                onChange={(event) => setCategoriaFiltro(Number(event.target.value))}
              >
                <MenuItem value={0}>Todas</MenuItem>
                {categorias.map((categoria) => (
                  <MenuItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Total de Productos: {productosFiltrados.length}
          </Typography>
          {productosFiltrados.length === 0 ? (
            <Typography color="text.secondary">No hay productos disponibles para esa búsqueda.</Typography>
          ) : (
            <Grid container spacing={3}>
              {productosFiltrados.map((producto) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={producto.id}>
                  <Card sx={productoCardStyles(producto.stockActual)}>
                    <CardMedia
                      component="img"
                      image={producto.imagen || imagenesBebidas[producto.nombre] || 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png'}
                      alt={producto.nombre}
                      sx={productoImagenStyles}
                    />
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={productoNombreStyles}
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
                      sx={productoDescripcionStyles}
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
                        Stock: {Math.max(0, producto.stockActual)}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      fullWidth
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={producto.stockActual <= 0}
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
          <Box sx={carritoPanelStyles}>
            <Typography variant="h5" gutterBottom>
              Carrito de compras
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {carrito.length === 0 ? (
              <Typography color="text.secondary">El carrito está vacío.</Typography>
            ) : (
              <List sx={carritoListaStyles}>
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
                              onChange={e => cambiarCantidad(item.producto.id, parseQuantityInput(e.target.value, item.producto.stockActual))}
                              onKeyDown={blockInvalidNumberKey}
                              inputProps={{
                                min: 1,
                                max: item.producto.stockActual,
                                step: 1,
                                inputMode: 'numeric',
                                pattern: '[0-9]*',
                                style: { width: 40, textAlign: 'center' }
                              }}
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

      <Dialog open={modalCaja !== null} onClose={() => setModalCaja(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{modalCaja === 'abrir' ? 'Apertura de caja' : 'Cierre y entrega de caja'}</DialogTitle>
        <DialogContent>
          {modalCaja === 'cerrar' && cajaActual && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Cuenta todo el efectivo físico disponible en la caja. El sistema separa el fondo base que se queda y el efectivo neto a entregar.
              </Alert>
              <Typography variant="body2">Fondo base que se queda: <b>{formatCurrency(cajaActual.montoInicial)}</b></Typography>
              <Typography variant="body2">Ventas en efectivo: <b>{formatCurrency(cajaActual.efectivoVentas ?? 0)}</b></Typography>
              <Typography variant="body2">Entradas de efectivo: <b>{formatCurrency(cajaActual.entradasEfectivo ?? 0)}</b></Typography>
              <Typography variant="body2">Salidas de efectivo: <b>{formatCurrency(cajaActual.salidasEfectivo ?? 0)}</b></Typography>
              <Divider sx={{ my: 1 }} />
              {cajaActual.pagos.map((pago) => (
                <Typography variant="body2" key={pago.metodo}>
                  {formatMetodoPagoBoleta(pago.metodo)}: <b>{formatCurrency(pago.total)}</b>
                </Typography>
              ))}
              <Typography variant="body2" sx={{ mt: 1 }}>
                Efectivo esperado en caja: <b>{formatCurrency(cajaActual.montoEsperado)}</b>
              </Typography>
              <Typography variant="body2">
                Efectivo a entregar al administrador: <b>{formatCurrency(cajaActual.efectivoAEntregar ?? 0)}</b>
              </Typography>
            </Box>
          )}
          {modalCaja === 'abrir' && esCajero && fondoCajaPendiente && (
            <Alert severity="info" sx={{ mb: 2 }}>
              El administrador actualizo tu fondo base a {formatCurrency(fondoCajaPendiente.monto)}.
            </Alert>
          )}
          {modalCaja === 'abrir' && esCajero && !fondoCajaPendiente && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Se usara el ultimo fondo base registrado. Si es la primera vez, el sistema pedira que el administrador lo asigne.
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label={modalCaja === 'abrir' ? (esCajero ? 'Fondo base de caja' : 'Monto inicial para vueltos') : 'Efectivo contado al cierre'}
            value={montoCaja}
            onChange={(e) => setMontoCaja(normalizeDecimalInput(e.target.value))}
            disabled={modalCaja === 'abrir' && esCajero}
            inputProps={{ inputMode: 'decimal', min: 0 }}
            InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
            sx={{ mt: 1 }}
          />
          {modalCaja === 'cerrar' && cajaActual && Number.isFinite(Number.parseFloat(montoCaja)) && (
            <Typography sx={{ mt: 1.5 }} color={Math.abs(Number.parseFloat(montoCaja) - cajaActual.montoEsperado) <= 0.01 ? 'success.main' : 'error.main'}>
              Diferencia: <b>{formatCurrency(Number.parseFloat(montoCaja) - cajaActual.montoEsperado)}</b>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCaja(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={modalCaja === 'abrir' ? 'success' : 'warning'}
            onClick={modalCaja === 'abrir' ? guardarAperturaCaja : guardarCierreCaja}
            disabled={cajaLoading || (modalCaja === 'cerrar' && montoCaja === '') || (modalCaja === 'abrir' && !esCajero && montoCaja === '')}
          >
            {modalCaja === 'abrir' ? 'Abrir caja' : 'Cerrar caja'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalMovimientoCaja !== null} onClose={() => setModalMovimientoCaja(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {modalMovimientoCaja === 'ENTRADA' ? 'Entrada de efectivo' : 'Salida de efectivo'}
        </DialogTitle>
        <DialogContent>
          <Alert severity={modalMovimientoCaja === 'ENTRADA' ? 'info' : 'warning'} sx={{ mb: 2 }}>
            {modalMovimientoCaja === 'ENTRADA'
              ? 'Registra dinero externo que ingresa a la gaveta. No cuenta como venta.'
              : 'Registra dinero retirado de la gaveta, por ejemplo pago a proveedor o gasto autorizado.'}
          </Alert>
          <TextField
            autoFocus
            fullWidth
            label="Monto"
            value={montoMovimientoCaja}
            onChange={(event) => setMontoMovimientoCaja(normalizeDecimalInput(event.target.value))}
            inputProps={{ inputMode: 'decimal', min: 0 }}
            InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Motivo"
            value={motivoMovimientoCaja}
            onChange={(event) => setMotivoMovimientoCaja(event.target.value)}
            multiline
            minRows={2}
            placeholder="Ejemplo: pago a proveedor, reposicion de sencillo, retiro autorizado"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalMovimientoCaja(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarMovimientoCaja} disabled={cajaLoading}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

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
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Tipo de comprobante
          </Typography>
          <RadioGroup
            row
            value={tipoBoleta}
            onChange={e => {
              setTipoBoleta(e.target.value as TipoBoleta);
              setDniCliente('');
              setNombresCliente('');
              setApellidosCliente('');
              setRucCliente('');
              setRazonSocialCliente('');
              setDireccionFiscalCliente('');
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="boleta" control={<Radio />} label="Boleta electrónica" />
            <FormControlLabel value="factura" control={<Radio />} label="Factura electrónica" />
          </RadioGroup>
          <Alert severity="info" sx={{ mb: 2 }}>
            {tipoBoleta === 'factura'
              ? 'Factura electrónica: requiere RUC y razón social del cliente.'
              : 'Boleta electrónica: requiere DNI y datos del cliente.'}
          </Alert>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {tipoBoleta === 'factura' ? 'Datos para factura electrónica' : 'Datos para boleta electrónica'}
            </Typography>
            {tipoBoleta === 'factura' ? (
              <Box>
                <Box display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
                  <TextField
                    label="RUC"
                    value={rucCliente}
                    onChange={e => setRucCliente(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    inputProps={{ maxLength: 11, inputMode: 'numeric' }}
                    helperText={`${rucCliente.trim().length}/11 dígitos`}
                    error={rucCliente.trim().length > 0 && rucCliente.trim().length !== 11}
                    size="small"
                    fullWidth
                    required
                  />
                  <Button
                    variant="outlined"
                    onClick={handleBuscarClienteRuc}
                    disabled={buscandoCliente}
                  >
                    {buscandoCliente ? 'Buscando...' : 'Buscar'}
                  </Button>
                </Box>
                <TextField
                  label="Razón social"
                  value={razonSocialCliente}
                  onChange={e => setRazonSocialCliente(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  sx={{ mb: 1 }}
                />
                <TextField
                  label="Dirección fiscal"
                  value={direccionFiscalCliente}
                  onChange={e => setDireccionFiscalCliente(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Box>
            ) : (
              <Box>
                <Box display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
                  <TextField
                    label="DNI"
                    value={dniCliente}
                    onChange={e => {
                      setDniCliente(e.target.value.replace(/\D/g, '').slice(0, 8));
                      setNombresCliente('');
                      setApellidosCliente('');
                    }}
                    inputProps={{ maxLength: 8, inputMode: 'numeric' }}
                    size="small"
                    fullWidth
                    required
                    error={dniCliente.trim().length > 0 && !isDniClienteValido(dniCliente)}
                    helperText={dniCliente.trim().length > 0 && !isDniClienteValido(dniCliente) ? 'Ingresa un DNI valido de 8 digitos.' : ' '}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleBuscarClienteDni}
                    disabled={buscandoCliente}
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
                    required
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
          </Box>
          <Typography variant="subtitle2">
            Método de pago
          </Typography>
          <RadioGroup
            row
            value={metodoPago}
            onChange={e => {
              const nextMetodo = e.target.value as 'efectivo' | 'yape' | 'mercadopago' | 'mixto';
              setMetodoPago(nextMetodo);
              if (nextMetodo !== 'efectivo') setRecibido('');
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="efectivo" control={<Radio />} label="Efectivo" />
            <FormControlLabel value="yape" control={<Radio />} label="Yape" />
            <FormControlLabel value="mercadopago" control={<Radio />} label="Mercado Pago" />
            <FormControlLabel value="mixto" control={<Radio />} label="Mixto: efectivo + Yape" />
          </RadioGroup>
          {metodoPago === 'efectivo' ? (
            <>
              <TextField
                label="Recibido"
                type="text"
                value={recibido}
                onChange={e => handleRecibidoChange(e.target.value)}
                onKeyDown={blockInvalidNumberKey}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                }}
                inputProps={{ min: 0, inputMode: 'decimal' }}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2">
                Vuelto: <b style={{ color: vuelto < 0 ? 'red' : 'green' }}>{formatCurrency(vuelto ?? 0)}</b>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Fondo para vueltos: {formatCurrency(vueltoConfig.montoBase)} · Saldo estimado: {formatCurrency(Math.max(0, vueltoConfig.montoBase - Math.max(0, vuelto || 0)))}
              </Typography>
              {vuelto > vueltoConfig.montoBase && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  El vuelto supera el fondo configurado para caja.
                </Alert>
              )}
            </>
          ) : metodoPago === 'mixto' ? (
            <Box sx={{ mt: 1 }}>
              <Alert severity={pagoMixtoValido ? 'success' : 'info'} sx={{ mb: 2 }}>
                Distribuye {formatCurrency(calcularTotal())} entre efectivo y Yape. Ambos montos deben ser mayores a cero.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Parte pagada en efectivo"
                    value={montoEfectivoMixto}
                    onChange={(e) => setMontoEfectivoMixto(normalizeDecimalInput(e.target.value))}
                    fullWidth
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Parte pagada con Yape"
                    value={montoYapeMixto}
                    onChange={(e) => setMontoYapeMixto(normalizeDecimalInput(e.target.value))}
                    fullWidth
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Efectivo recibido del cliente"
                    value={recibidoMixto}
                    onChange={(e) => setRecibidoMixto(normalizeDecimalInput(e.target.value))}
                    fullWidth
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
                    helperText={`Vuelto: ${formatCurrency(vueltoMixto)}`}
                  />
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ mt: 1.5 }} color={Math.abs(totalMixto - calcularTotal()) <= 0.01 ? 'success.main' : 'error.main'}>
                Suma ingresada: <b>{formatCurrency(totalMixto)}</b> · Falta: <b>{formatCurrency(Math.max(0, calcularTotal() - totalMixto))}</b>
              </Typography>
            </Box>
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
                onClick={() => globalThis.location.assign(mpPaymentLink)}
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
                !documentoClienteValido() ||
                (metodoPago === 'efectivo' && efectivoEsInsuficiente()) ||
                (metodoPago === 'mixto' && !pagoMixtoValido)
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
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { maxWidth: 760 }
        }}
      >
        <DialogTitle>{tipoBoletaReciente === 'factura' ? 'Venta realizada - Factura electrónica' : 'Venta realizada - Boleta electrónica'}</DialogTitle>
        <DialogContent
          dividers
        >
          {ventaReciente && typeof ventaReciente === 'object' && renderBoletaImpresion(ventaReciente)}
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
          <Button
            onClick={() => imprimirBoleta()}
            color="primary"
            variant="contained"
            startIcon={<Print />}
          >
            {tipoBoletaReciente === 'factura' ? 'Imprimir factura electrónica' : 'Imprimir boleta electrónica'}
          </Button>
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
          sx={fullWidthSnackbarStyles}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <BarcodeScannerDialog
        open={scannerOpen}
        title="Escanear código de barras"
        onClose={() => setScannerOpen(false)}
        onDetected={handleCodigoDetectadoVenta}
      />
    </Container>
  );
};

export default VentasPage; 
