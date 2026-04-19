import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Checkbox,
  Snackbar,
  Alert
} from '@mui/material';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import Print from '@mui/icons-material/Print';
import { useAuth } from '../contexts/AuthContext';
import { Venta, Categoria, Producto } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createVenta,
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  getProductos,
  getCategorias,
  createCategoria,
  createProducto
} from '../services/api';
import { ClienteDniData, buscarClientePorDni } from '../apidni/dniService';
import { BOLETA_CONFIG_UPDATE_EVENT, BoletaConfig, loadBoletaConfig } from '../utils/boletaConfig';
import { saveVentaClienteInfo } from '../utils/ventasClienteMap';
import { saveVentaVendedorInfo } from '../utils/ventasVendedorMap';

interface MesaState {
  enUso: boolean;
  tiempoInicio: number | null;
  tiempoTranscurrido: number; // en segundos
  total: number;
  precioPorHora: number;
}

interface BoletaMesa {
  ventaId: number;
  numero: number;
  fecha: string;
  mesa: number;
  tiempo: number;
  precioPorHora: number;
  total: number;
  usuario?: string;
  metodoPago?: string;
  recibido?: number;
  vuelto?: number;
  cliente?: ClienteBoleta | null;
  detalleProductos: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
}

interface ClienteBoleta {
  dni: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
}

interface MPPendingMesaSale {
  mesa: number;
  tiempo: number;
  precioPorHora: number;
  total: number;
  cliente?: ClienteBoleta | null;
}

const inicializarMesa = (precio = 50): MesaState => ({
  enUso: false,
  tiempoInicio: null,
  tiempoTranscurrido: 0,
  total: 0,
  precioPorHora: precio
});

const MESA_COUNT = 4;
const MESAS_KEY = 'mesas';
const MESA_IMAGE = `${process.env.PUBLIC_URL}/images/mesaBt.jpg`;
const QR_YAPE = `${process.env.PUBLIC_URL}/images/yape.png`;

const MESA_CATEGORY_NAME = 'Servicios';
const MESA_PRODUCT_DESCRIPTION = 'Servicio de mesa de billar';
const MESA_PRODUCT_STOCK = 100000;

const getMesasFromStorage = () => {
  const data = localStorage.getItem(MESAS_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const list = Array.isArray(parsed) ? parsed : [];
      const normalized = list.slice(0, MESA_COUNT).map((mesa) =>
        inicializarMesa(typeof mesa?.precioPorHora === 'number' ? mesa.precioPorHora : 50)
      );
      for (let i = 0; i < normalized.length; i += 1) {
        const original = list[i] || {};
        normalized[i] = {
          ...normalized[i],
          enUso: Boolean(original.enUso),
          tiempoInicio: typeof original.tiempoInicio === 'number' ? original.tiempoInicio : null,
          tiempoTranscurrido: typeof original.tiempoTranscurrido === 'number' ? original.tiempoTranscurrido : 0,
          total: typeof original.total === 'number' ? original.total : 0
        };
      }
      while (normalized.length < MESA_COUNT) {
        normalized.push(inicializarMesa());
      }
      return normalized;
    } catch {
      return Array.from({ length: MESA_COUNT }, () => inicializarMesa());
    }
  }
  return Array.from({ length: MESA_COUNT }, () => inicializarMesa());
};

const MesasPage: React.FC = () => {
  const [mesas, setMesas] = useState<MesaState[]>(getMesasFromStorage());
  const [boletaMesa, setBoletaMesa] = useState<BoletaMesa | null>(null);
  const [modalBoleta, setModalBoleta] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [mesaCobro, setMesaCobro] = useState<{
    idx: number;
    mesa: number;
    tiempo: number;
    precioPorHora: number;
    total: number;
  } | null>(null);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'yape' | 'mercadopago' | 'tarjeta'>('efectivo');
  const [recibido, setRecibido] = useState('');
  const [vuelto, setVuelto] = useState(0);
  const [emitirConCliente, setEmitirConCliente] = useState(false);
  const [dniCliente, setDniCliente] = useState('');
  const [nombresCliente, setNombresCliente] = useState('');
  const [apellidosCliente, setApellidosCliente] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mesaProductos, setMesaProductos] = useState<Record<number, number>>({});
  const [boletaEmpresa, setBoletaEmpresa] = useState<BoletaConfig>(() => loadBoletaConfig());
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const { user } = useAuth();
  const isCajero = user?.rol === 'CAJERO';
  const location = useLocation();
  const navigate = useNavigate();
  const mpPaymentLink = process.env.REACT_APP_MP_PAYMENT_LINK;

  React.useEffect(() => {
    const reloadBoletaConfig = () => setBoletaEmpresa(loadBoletaConfig());
    window.addEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
    window.addEventListener('storage', reloadBoletaConfig);
    return () => {
      window.removeEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
      window.removeEventListener('storage', reloadBoletaConfig);
    };
  }, []);

  // Guardar en localStorage cada vez que cambian las mesas
  React.useEffect(() => {
    localStorage.setItem(MESAS_KEY, JSON.stringify(mesas));
  }, [mesas]);

  // Actualizar el tiempo cada segundo si alguna mesa está en uso
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMesas(prev => prev.map(mesa => {
        if (mesa.enUso && mesa.tiempoInicio) {
          const tiempoTranscurrido = Math.floor((Date.now() - mesa.tiempoInicio) / 1000);
          const horas = tiempoTranscurrido / 3600;
          return {
            ...mesa,
            tiempoTranscurrido,
            total: Math.ceil(horas * mesa.precioPorHora)
          };
        }
        return mesa;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const iniciarMesa = (idx: number) => {
    setMesas(prev => prev.map((mesa, i) =>
      i === idx ? { ...mesa, enUso: true, tiempoInicio: Date.now(), tiempoTranscurrido: 0, total: 0 } : mesa
    ));
  };

  const pararMesa = (idx: number) => {
    setMesas(prev => prev.map((mesa, i) =>
      i === idx ? { ...mesa, enUso: false, tiempoInicio: null } : mesa
    ));
  };

  const resetearMesa = React.useCallback((idx: number) => {
    setMesas(prev => prev.map((mesa, i) =>
      i === idx ? inicializarMesa(mesa.precioPorHora) : mesa
    ));
  }, []);

  const cambiarPrecio = (idx: number, nuevoPrecio: number) => {
    setMesas(prev => prev.map((mesa, i) =>
      i === idx ? { ...mesa, precioPorHora: nuevoPrecio } : mesa
    ));
  };

  const formatTiempo = (segundos: number) => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => `S/ ${value.toFixed(2)}`;

  const showSnackbar = React.useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const resetDatosCliente = React.useCallback(() => {
    setEmitirConCliente(false);
    setDniCliente('');
    setNombresCliente('');
    setApellidosCliente('');
  }, []);

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

  const getClienteMesaActual = (): ClienteBoleta | null => {
    if (!emitirConCliente) return null;
    const payload = normalizeCliente({
      dni: dniCliente,
      nombres: nombresCliente,
      apellidos: apellidosCliente,
      nombreCompleto: [nombresCliente, apellidosCliente].filter(Boolean).join(' ').trim()
    });
    if (!payload.dni && !payload.nombreCompleto) return null;
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
      const message = error?.response?.data?.message || error?.message || 'No se pudo consultar el DNI';
      showSnackbar(message, 'error');
    } finally {
      setBuscandoCliente(false);
    }
  };

  const ensureMesaProducto = React.useCallback(async (mesaNumero: number) => {
    if (mesaProductos[mesaNumero]) return mesaProductos[mesaNumero];
    const categorias: Categoria[] = await getCategorias();
    const productos: Producto[] = await getProductos();
    const nombreCategoria = MESA_CATEGORY_NAME.toLowerCase();
    let categoria: Categoria | undefined = categorias.find(
      (cat) => (cat.nombre || '').toLowerCase() === nombreCategoria
    );
    if (!categoria) {
      const created = await createCategoria({
        nombre: MESA_CATEGORY_NAME,
        descripcion: 'Servicios del local'
      });
      categoria = created as Categoria;
    }
    if (!categoria) {
      throw new Error('No se pudo crear la categoría de servicios.');
    }
    const nombreProducto = `Mesa ${mesaNumero} (Billar)`;
    let producto: Producto | undefined = productos.find((prod) => prod.nombre === nombreProducto);
    if (!producto) {
      const created = await createProducto({
        nombre: nombreProducto,
        descripcion: MESA_PRODUCT_DESCRIPTION,
        precioVenta: 0,
        precioCompra: null,
        stockActual: MESA_PRODUCT_STOCK,
        stockMinimo: 0,
        categoriaId: categoria.id,
        imagen: '',
        activo: true
      });
      producto = created as Producto;
    }
    if (!producto) {
      throw new Error('No se pudo crear el producto de la mesa.');
    }
    const productoId = (producto as Producto).id;
    setMesaProductos((prev) => ({ ...prev, [mesaNumero]: productoId }));
    return productoId;
  }, [mesaProductos]);

  const cerrarModalPago = React.useCallback(() => {
    setModalPago(false);
    setMesaCobro(null);
    setMetodoPago('efectivo');
    setRecibido('');
    setVuelto(0);
    setMpInitPoint(null);
    setBuscandoCliente(false);
    resetDatosCliente();
  }, [resetDatosCliente]);

  const getMesaActualizada = (mesa: MesaState) => {
    if (mesa.enUso && mesa.tiempoInicio) {
      const tiempoTranscurrido = Math.floor((Date.now() - mesa.tiempoInicio) / 1000);
      const horas = tiempoTranscurrido / 3600;
      return {
        ...mesa,
        tiempoTranscurrido,
        total: Math.ceil(horas * mesa.precioPorHora)
      };
    }
    return mesa;
  };

  const completarVentaMesa = React.useCallback(async (
    mesaInfo: { idx: number; mesa: number; tiempo: number; precioPorHora: number; total: number },
    metodo: 'efectivo' | 'yape' | 'mercadopago' | 'tarjeta',
    recibidoValor: number,
    vueltoValor: number,
    cliente: ClienteBoleta | null
  ): Promise<boolean> => {
    try {
      setSaving(true);
      const productoId = await ensureMesaProducto(mesaInfo.mesa);
      const venta = await createVenta({
        productosVendidos: [
          {
            productoId,
            cantidad: 1,
            precioUnitario: mesaInfo.total
          }
        ],
        total: mesaInfo.total,
        metodoPago: metodo,
        recibido: recibidoValor,
        vuelto: vueltoValor,
        clienteDni: cliente?.dni || null,
        clienteNombre: cliente?.nombreCompleto || null,
        vendedorId: user?.id || null,
        vendedorUsuario: user?.nombreUsuario || null,
        vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
      });

      saveVentaClienteInfo((venta as Venta).id, {
        clienteNombre: cliente?.nombreCompleto || null,
        clienteDni: cliente?.dni || null
      });
      saveVentaVendedorInfo((venta as Venta).id, {
        vendedorId: user?.id || null,
        vendedorUsuario: user?.nombreUsuario || null,
        vendedorNombre: user?.nombreCompleto || user?.nombreUsuario || null
      });

      if (window && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('ventaRealizada'));
      }

      setBoletaMesa({
        ventaId: (venta as Venta).id || mesaInfo.mesa,
        numero: (venta as Venta).numero || (venta as Venta).id || mesaInfo.mesa,
        fecha: (venta as Venta).fecha || new Date().toISOString(),
        mesa: mesaInfo.mesa,
        tiempo: mesaInfo.tiempo,
        precioPorHora: mesaInfo.precioPorHora,
        total: mesaInfo.total,
        usuario: user?.nombreCompleto || user?.nombreUsuario,
        metodoPago: metodo,
        recibido: recibidoValor,
        vuelto: vueltoValor,
        cliente,
        detalleProductos: [
          {
            nombre: `Mesa ${mesaInfo.mesa} (Billar)`,
            cantidad: 1,
            precioUnitario: mesaInfo.total,
            subtotal: mesaInfo.total
          }
        ]
      });
      setModalBoleta(true);
      resetearMesa(mesaInfo.idx);
      cerrarModalPago();
      return true;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'No se pudo registrar la venta.';
      showSnackbar(message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    ensureMesaProducto,
    showSnackbar,
    resetearMesa,
    cerrarModalPago,
    user?.nombreCompleto,
    user?.nombreUsuario
  ]);

  React.useEffect(() => {
    if (!mesaCobro) return;
    if (metodoPago === 'efectivo') {
      const rec = parseFloat(recibido);
      setVuelto(rec > 0 ? rec - mesaCobro.total : 0);
    } else {
      setVuelto(0);
    }
  }, [recibido, metodoPago, mesaCobro]);

  React.useEffect(() => {
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
        const pendingRaw = localStorage.getItem('mp_pending_mesa_sale');
        const pending = pendingRaw ? (JSON.parse(pendingRaw) as MPPendingMesaSale) : null;
        if (!pending || !pending.mesa) {
          showSnackbar('Pago aprobado pero no se encontró venta pendiente.', 'error');
          return;
        }
        const mesaInfo = {
          idx: Math.max(0, Number(pending.mesa) - 1),
          mesa: Number(pending.mesa),
          tiempo: Number(pending.tiempo || 0),
          precioPorHora: Number(pending.precioPorHora || 0),
          total: Number(pending.total || 0)
        };
        const clientePendiente = pending.cliente ? normalizeCliente(pending.cliente) : null;
        const ok = await completarVentaMesa(mesaInfo, 'mercadopago', mesaInfo.total, 0, clientePendiente);
        if (ok) {
          localStorage.removeItem('mp_pending_mesa_sale');
          showSnackbar('Pago aprobado y venta registrada', 'success');
        }
      } catch (error) {
        showSnackbar('No se pudo confirmar el pago.', 'error');
      } finally {
        navigate(location.pathname, { replace: true });
      }
    };

    finalizeMercadoPago();
  }, [location.search, location.pathname, navigate, completarVentaMesa, showSnackbar]);

  const abrirModalPago = (idx: number) => {
    const mesaActual = getMesaActualizada(mesas[idx]);
    if (!mesaActual || mesaActual.tiempoTranscurrido <= 0 || mesaActual.total <= 0) {
      window.alert('No hay tiempo registrado para cobrar esta mesa.');
      return;
    }
    const snapshot = {
      idx,
      mesa: idx + 1,
      tiempo: mesaActual.tiempoTranscurrido,
      precioPorHora: mesaActual.precioPorHora,
      total: mesaActual.total
    };
    if (!mesaCobro || mesaCobro.idx !== idx) {
      setMpInitPoint(null);
    }
    resetDatosCliente();
    setMesaCobro(snapshot);
    setMetodoPago('efectivo');
    setRecibido('');
    setVuelto(0);
    setMesas(prev => prev.map((mesa, i) =>
      i === idx
        ? {
            ...mesa,
            enUso: false,
            tiempoInicio: null,
            tiempoTranscurrido: snapshot.tiempo,
            total: snapshot.total
          }
        : mesa
    ));
    setModalPago(true);
  };

  const iniciarPagoMercadoPagoMesa = async () => {
    if (!mesaCobro) return;
    setMpLoading(true);
    try {
      if (mpPaymentLink) {
        window.open(mpPaymentLink, '_blank', 'noopener,noreferrer');
        showSnackbar('Se abrió el link de pago.', 'success');
        return;
      }

      const items = [
        {
          title: `Mesa ${mesaCobro.mesa} (Billar)`,
          quantity: 1,
          unit_price: Number(mesaCobro.total || 0)
        }
      ];
      const origin = window.location.origin;
      const backBase = process.env.REACT_APP_MP_BACK_URL_BASE || origin;
      const backUrl = `${backBase}/dashboard/mesas`;
      const notificationUrl = process.env.REACT_APP_MP_NOTIFICATION_URL;
      const canSendUrls = backBase.startsWith('https://');

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
        externalReference: `mesa-${mesaCobro.mesa}-${Date.now()}`
      });

      const initPoint = preference.init_point || preference.sandbox_init_point;
      if (!initPoint) {
        throw new Error('No se recibió el link de pago.');
      }

      const pendingPayload = {
        mesa: mesaCobro.mesa,
        tiempo: mesaCobro.tiempo,
        precioPorHora: mesaCobro.precioPorHora,
        total: mesaCobro.total,
        cliente: getClienteMesaActual()
      } as MPPendingMesaSale;
      localStorage.setItem('mp_pending_mesa_sale', JSON.stringify(pendingPayload));
      setMpInitPoint(initPoint);
      window.open(initPoint, '_blank', 'noopener,noreferrer');
      showSnackbar('Se abrió Mercado Pago. Completa el pago y vuelve.', 'success');
      setModalPago(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al generar pago con Mercado Pago';
      const details = error?.response?.data?.details;
      const detailText = details ? ` (${JSON.stringify(details)})` : '';
      showSnackbar(`${message}${detailText}`, 'error');
    } finally {
      setMpLoading(false);
    }
  };

  const registrarVentaManualMesa = async () => {
    if (!mesaCobro) return;
    const confirmPaid = window.confirm(
      '¿El pago ya fue realizado? Esta acción no valida con Mercado Pago.'
    );
    if (!confirmPaid) return;
    await completarVentaMesa(mesaCobro, 'mercadopago', mesaCobro.total, 0, getClienteMesaActual());
  };

  const confirmarCobroMesa = async () => {
    if (!mesaCobro) return;
    if (metodoPago === 'mercadopago') {
      await iniciarPagoMercadoPagoMesa();
      return;
    }
    if (metodoPago === 'efectivo') {
      const rec = parseFloat(recibido) || 0;
      if (rec < mesaCobro.total) {
        showSnackbar('El monto recibido es insuficiente.', 'error');
        return;
      }
      await completarVentaMesa(mesaCobro, metodoPago, rec, vuelto || 0, getClienteMesaActual());
      return;
    }
    await completarVentaMesa(mesaCobro, metodoPago, mesaCobro.total, 0, getClienteMesaActual());
  };

  const formatMetodoPagoBoleta = (metodo?: string) => {
    if (!metodo) return '-';
    const key = metodo.toLowerCase();
    if (key === 'mercadopago') return 'Mercado Pago';
    if (key === 'mercadopago_link') return 'Mercado Pago';
    if (key === 'yape') return 'Yape';
    if (key === 'efectivo') return 'Efectivo';
    if (key === 'tarjeta') return 'Tarjeta';
    return metodo;
  };

  const formatBoletaSerieNumeroMesa = (boleta: BoletaMesa) => {
    const raw = boleta.numero || boleta.ventaId || 0;
    return `${boletaEmpresa.serie} - ${String(raw).padStart(6, '0')}`;
  };

  const formatFechaBoleta = (fecha?: string) => {
    if (!fecha) return new Date().toLocaleDateString('en-CA');
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) return new Date().toLocaleDateString('en-CA');
    return parsed.toLocaleDateString('en-CA');
  };

  const imprimirBoletaMesa = () => {
    const printContents = document.getElementById('boleta-mesa-print')?.innerHTML;
    if (!printContents) return;
    const boletaNumero = boletaMesa ? formatBoletaSerieNumeroMesa(boletaMesa) : 'SIN-NUMERO';
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

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Mesas de Billar
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Administra el tiempo y cobro de las mesas de billar. Inicia, detén y resetea el tiempo de cada mesa. El precio es por hora y se calcula automáticamente.
      </Typography>
      <Grid container spacing={3}>
        {mesas.map((mesa, idx) => (
          <Grid item xs={12} sm={6} lg={4} xl={3} key={idx}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
                  <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                      <SportsBarIcon color="primary" sx={{ fontSize: 32 }} />
                      <Typography variant="h6">Mesa {idx + 1}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Tiempo: <b>{formatTiempo(mesa.tiempoTranscurrido)}</b>
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} my={1}>
                      <Typography variant="body2" color="text.secondary">
                        Precio por hora:
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        value={mesa.precioPorHora}
                        onChange={e => cambiarPrecio(idx, Math.max(1, parseInt(e.target.value) || 1))}
                        inputProps={{ min: 1, style: { width: 60 } }}
                        sx={{ mx: 1 }}
                        InputProps={{ startAdornment: <span style={{ marginRight: 2 }}>S/</span> }}
                        disabled={isCajero}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Total: <b style={{ color: 'green' }}>S/ {mesa.total}</b>
                    </Typography>
                  </Box>
                  <Box
                    component="img"
                    src={MESA_IMAGE}
                    alt="Mesa de billar"
                    sx={{ width: 110, height: 80, objectFit: 'contain', opacity: 0.9 }}
                  />
                </Box>
              </CardContent>
              <CardActions>
                {!mesa.enUso ? (
                  <Button variant="contained" color="primary" onClick={() => iniciarMesa(idx)}>
                    Iniciar
                  </Button>
                ) : (
                  <Button variant="contained" color="warning" onClick={() => pararMesa(idx)}>
                    Parar
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => abrirModalPago(idx)}
                  disabled={mesa.tiempoTranscurrido <= 0 || mesa.total <= 0}
                >
                  Cobrar
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => resetearMesa(idx)}>
                  Resetear
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={modalPago} onClose={cerrarModalPago} maxWidth="xs" fullWidth>
        <DialogTitle>Cobrar mesa</DialogTitle>
        <DialogContent>
          {mesaCobro ? (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mesa {mesaCobro.mesa} - Tiempo: <b>{formatTiempo(mesaCobro.tiempo)}</b>
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Total a pagar: <b>{formatCurrency(mesaCobro.total)}</b>
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Selecciona una mesa para cobrar.
            </Typography>
          )}
          <RadioGroup
            row
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value as 'efectivo' | 'yape' | 'mercadopago' | 'tarjeta')}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="efectivo" control={<Radio />} label="Efectivo" />
            <FormControlLabel value="yape" control={<Radio />} label="Yape" />
            <FormControlLabel value="tarjeta" control={<Radio />} label="Tarjeta" />
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
                  startAdornment: <InputAdornment position="start">S/</InputAdornment>
                }}
                inputProps={{ min: mesaCobro?.total ?? 0 }}
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
          ) : metodoPago === 'tarjeta' ? (
            <Typography variant="body2" color="text.secondary">
              Se registrará el cobro con tarjeta al confirmar.
            </Typography>
          ) : (
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Se abrirá Mercado Pago en una nueva pestaña para completar el pago.
              </Typography>
              {mpPaymentLink && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Link de pago fijo configurado. El registro será manual.
                </Typography>
              )}
              {mpInitPoint && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.open(mpInitPoint, '_blank', 'noopener,noreferrer')}
                  disabled={mpLoading}
                >
                  Abrir pago
                </Button>
              )}
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={emitirConCliente}
                onChange={(_e, checked) => {
                  setEmitirConCliente(checked);
                  if (!checked) {
                    setDniCliente('');
                    setNombresCliente('');
                    setApellidosCliente('');
                  }
                }}
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
                  onChange={(e) => setDniCliente(e.target.value.replace(/\D/g, '').slice(0, 8))}
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
                  onChange={(e) => setNombresCliente(e.target.value)}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Apellidos"
                  value={apellidosCliente}
                  onChange={(e) => setApellidosCliente(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarModalPago} color="secondary">
            Cancelar
          </Button>
          {metodoPago === 'mercadopago' && mpPaymentLink ? (
            <>
              <Button
                component="a"
                href={mpPaymentLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                color="primary"
                disabled={mpLoading}
              >
                Pagar
              </Button>
              <Button
                onClick={registrarVentaManualMesa}
                variant="outlined"
                color="primary"
                disabled={saving}
              >
                Registrar venta
              </Button>
            </>
          ) : (
            <Button
              onClick={confirmarCobroMesa}
              variant="contained"
              color="primary"
              disabled={
                !mesaCobro ||
                saving ||
                mpLoading ||
                (metodoPago === 'efectivo' && parseFloat(recibido) < (mesaCobro?.total ?? 0))
              }
            >
              {metodoPago === 'mercadopago' ? 'Ir a pagar con Mercado Pago' : 'Confirmar cobro'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={modalBoleta} onClose={() => setModalBoleta(false)} maxWidth="md" fullWidth>
        <DialogTitle>Venta realizada</DialogTitle>
        <DialogContent dividers>
          {boletaMesa && (
            <Box
              id="boleta-mesa-print"
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
                <Box className="boleta-empresa-box" sx={{ p: 0.2, bgcolor: 'transparent', fontSize: { xs: 11, sm: 11 } }}>
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
                    {formatBoletaSerieNumeroMesa(boletaMesa)}
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
                  <div><strong>CLIENTE:</strong> {boletaMesa.cliente?.nombreCompleto || 'PUBLICO EN GENERAL'}</div>
                  <div><strong>DNI:</strong> {boletaMesa.cliente?.dni || '-'}</div>
                  <div><strong>METODO DE PAGO:</strong> {formatMetodoPagoBoleta(boletaMesa.metodoPago)}</div>
                  <div><strong>ID DE VENTA:</strong> {boletaMesa.ventaId}</div>
                  <div><strong>FECHA:</strong> {formatFechaBoleta(boletaMesa.fecha)}</div>
                  <div><strong>MESA:</strong> {boletaMesa.mesa} ({formatTiempo(boletaMesa.tiempo)})</div>
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
                  {boletaMesa.detalleProductos.map((prod, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #666', padding: '4px 6px', fontSize: 10 }}>{prod.nombre}</td>
                      <td style={{ border: '1px solid #666', padding: '4px 6px', textAlign: 'center', fontSize: 10 }}>{prod.cantidad}</td>
                      <td style={{ border: '1px solid #666', padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(prod.precioUnitario)}</td>
                      <td style={{ border: '1px solid #666', padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(prod.subtotal)}</td>
                    </tr>
                  ))}
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
                  {formatCurrency(boletaMesa.total)}
                </Box>
              </Box>

              <Box
                className="boleta-footer"
                sx={{
                  mt: 1.2,
                  textAlign: 'center',
                  bgcolor: 'transparent',
                  px: 0,
                  py: 0,
                  fontSize: { xs: 16, sm: 12 },
                  lineHeight: 1.2
                }}
              >
                <div>¡Gracias por su compra!</div>
                <div>Vuelva pronto</div>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalBoleta(false)}>Cerrar</Button>
          <Button onClick={imprimirBoletaMesa} color="primary" variant="contained" startIcon={<Print />}>
            Imprimir boleta
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MesasPage; 
