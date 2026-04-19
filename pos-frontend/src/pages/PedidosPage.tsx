import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SearchIcon from '@mui/icons-material/Search';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import DeliveryDiningOutlinedIcon from '@mui/icons-material/DeliveryDiningOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { alpha } from '@mui/material/styles';
import { getPedidos, PedidoEstado, updatePedidoEstado } from '../services/pedidos';
import { Venta } from '../types';
import { useI18n } from '../hooks/useI18n';
import { assignRepartidorToPedido, getPedidoTracking, getRepartidores, PedidoTrackingResponse } from '../services/reparto';
import { LiveLeafletMap } from '../components/maps/LiveLeafletMap';
import { deleteVentasByIds } from '../services/api';
import { BOLETA_CONFIG_UPDATE_EVENT, BoletaConfig, loadBoletaConfig } from '../utils/boletaConfig';

const estadoChip = (estado?: string | null) => {
  const v = String(estado || '').toLowerCase();
  if (v === 'pendiente') return { label: 'Pendiente', color: 'warning' as const };
  if (v === 'creando') return { label: 'Preparando', color: 'info' as const };
  if (v === 'en_camino') return { label: 'En camino', color: 'primary' as const };
  if (v === 'entregado') return { label: 'Entregado', color: 'success' as const };
  if (v === 'rechazado') return { label: 'Rechazado', color: 'error' as const };
  return { label: '—', color: 'default' as const };
};

const formatCurrency = (value?: number | null) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const getMinutesSince = (dateValue?: string | null) => {
  if (!dateValue) return 0;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
};

const getPedidoUrgency = (pedido: Venta) => {
  const estado = String(pedido.pedidoEstado || '').toLowerCase();
  const baseTime = pedido.pedidoUpdatedAt || pedido.fecha;
  const minutes = getMinutesSince(baseTime);
  const isUnassigned = !pedido.repartidorId;

  if (estado === 'pendiente') {
    if (minutes >= 20) return { label: 'Urgente', color: 'error' as const, priority: 1 };
    if (minutes >= 8) return { label: 'Atender pronto', color: 'warning' as const, priority: 2 };
    return { label: 'Nuevo', color: 'info' as const, priority: 3 };
  }

  if (estado === 'creando') {
    if (isUnassigned) return { label: 'Falta repartidor', color: 'warning' as const, priority: 2 };
    if (minutes >= 18) return { label: 'Salida demorada', color: 'warning' as const, priority: 3 };
    return { label: 'Preparando salida', color: 'info' as const, priority: 4 };
  }

  if (estado === 'en_camino') {
    if (minutes >= 35) return { label: 'Revisar ruta', color: 'warning' as const, priority: 4 };
    return { label: 'En reparto', color: 'primary' as const, priority: 5 };
  }

  if (estado === 'rechazado') return { label: 'Cerrado', color: 'error' as const, priority: 7 };
  if (estado === 'entregado') return { label: 'Cerrado', color: 'success' as const, priority: 6 };
  return { label: 'Sin prioridad', color: 'default' as const, priority: 10 };
};

const sortPedidosForQueue = (a: Venta, b: Venta) => {
  const urgencyDiff = getPedidoUrgency(a).priority - getPedidoUrgency(b).priority;
  if (urgencyDiff !== 0) return urgencyDiff;

  const aTime = new Date(a.pedidoUpdatedAt || a.fecha).getTime();
  const bTime = new Date(b.pedidoUpdatedAt || b.fecha).getTime();

  if (String(a.pedidoEstado || '').toLowerCase() === 'entregado') return bTime - aTime;
  if (String(a.pedidoEstado || '').toLowerCase() === 'rechazado') return bTime - aTime;
  return aTime - bTime;
};

const buildMapsUrl = (pedido?: Venta | null) => {
  if (!pedido) return '';
  if (
    pedido.ubicacionLat !== null &&
    pedido.ubicacionLat !== undefined &&
    pedido.ubicacionLng !== null &&
    pedido.ubicacionLng !== undefined
  ) {
    return `https://www.google.com/maps?q=${pedido.ubicacionLat},${pedido.ubicacionLng}`;
  }
  if (String(pedido.direccionEntrega || '').trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(pedido.direccionEntrega || '').trim())}`;
  }
  return '';
};

const buildVisiblePedidoNumbers = (pedidos: Venta[]) =>
  [...pedidos]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .reduce<Record<number, number>>((acc, pedido, index) => {
      acc[pedido.id] = index + 1;
      return acc;
    }, {});

const formatMetodoPagoLabel = (metodo?: string | null) => {
  const value = String(metodo || '').trim().toLowerCase();
  if (!value) return '—';
  if (value === 'mercadopago' || value === 'mercadopago_link') return 'Mercado Pago';
  if (value === 'efectivo_contra_entrega') return 'Efectivo al recibir';
  if (value === 'efectivo_al_recojo') return 'Efectivo al recoger';
  if (value === 'efectivo') return 'Efectivo';
  if (value === 'yape') return 'Yape';
  if (value === 'tarjeta') return 'Tarjeta';
  return metodo || '—';
};

const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ACTIVE_ESTADOS: PedidoEstado[] = ['pendiente', 'creando', 'en_camino'];
const HISTORY_ESTADOS: PedidoEstado[] = ['entregado', 'rechazado'];

const PedidosPage: React.FC = () => {
  const { t } = useI18n();
  const [boletaEmpresa, setBoletaEmpresa] = useState<BoletaConfig>(() => loadBoletaConfig());
  const [estado, setEstado] = useState<PedidoEstado>('pendiente');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pedidos, setPedidos] = useState<Venta[]>([]);
  const [repartidores, setRepartidores] = useState<Array<any>>([]);
  const [asignacion, setAsignacion] = useState<Record<number, number | ''>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [motivoRechazo, setMotivoRechazo] = useState<Record<number, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [soloSinRepartidor, setSoloSinRepartidor] = useState(false);
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  const [selectedTracking, setSelectedTracking] = useState<PedidoTrackingResponse | null>(null);

  const lastIdsRef = useRef<number[]>([]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await getPedidos(estado);
      const list = Array.isArray(data) ? data : [];
      setPedidos(list);

      if (estado === 'pendiente') {
        const ids = list.map((p) => p.id);
        const prev = lastIdsRef.current;
        const newCount = ids.filter((id) => !prev.includes(id)).length;
        lastIdsRef.current = ids;
        if (newCount > 0) {
          setSnack({ open: true, message: `${newCount} pedido(s) nuevo(s)` });
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuevo pedido', { body: `${newCount} pedido(s) pendiente(s)` });
          }
        }
      }
    } catch (e: any) {
      setPedidos([]);
      setError(String(e?.message || t('Error al cargar pedidos', 'Error loading orders')));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const loadRepartidores = async () => {
    try {
      const reps = await getRepartidores();
      setRepartidores(Array.isArray(reps) ? reps : []);
    } catch {
      setRepartidores([]);
    }
  };

  useEffect(() => {
    void loadRepartidores();
  }, []);

  useEffect(() => {
    const reloadBoletaConfig = () => setBoletaEmpresa(loadBoletaConfig());
    window.addEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
    return () => window.removeEventListener(BOLETA_CONFIG_UPDATE_EVENT, reloadBoletaConfig);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadRepartidores();
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void load(true);
    }, 10000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  useEffect(() => {
    if (historyOpen && !HISTORY_ESTADOS.includes(estado)) {
      setEstado('entregado');
      return;
    }
    if (!historyOpen && !ACTIVE_ESTADOS.includes(estado)) {
      setEstado('pendiente');
    }
  }, [estado, historyOpen]);

  const filteredPedidos = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return [...pedidos]
      .filter((pedido) => {
        if (soloSinRepartidor && pedido.repartidorId) return false;
        if (!term) return true;
        const haystack = [
          pedido.id,
          pedido.clienteNombre,
          pedido.clienteDni,
          pedido.direccionEntrega,
          pedido.vendedorNombre,
          pedido.vendedorUsuario,
          pedido.metodoPago
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return haystack.includes(term);
      })
      .sort(sortPedidosForQueue);
  }, [busqueda, pedidos, soloSinRepartidor]);

  useEffect(() => {
    if (filteredPedidos.length === 0) {
      setSelectedPedidoId(null);
      return;
    }
    if (!selectedPedidoId || !filteredPedidos.some((pedido) => pedido.id === selectedPedidoId)) {
      setSelectedPedidoId(filteredPedidos[0].id);
    }
  }, [filteredPedidos, selectedPedidoId]);

  const selectedPedido = useMemo(
    () => filteredPedidos.find((pedido) => pedido.id === selectedPedidoId) || null,
    [filteredPedidos, selectedPedidoId]
  );

  useEffect(() => {
    if (!selectedPedido?.id) {
      setSelectedTracking(null);
      return;
    }
    let cancelled = false;
    const shouldTrack = Boolean(
      selectedPedido.repartidorId ||
      (selectedPedido.ubicacionLat !== null &&
        selectedPedido.ubicacionLat !== undefined &&
        selectedPedido.ubicacionLng !== null &&
        selectedPedido.ubicacionLng !== undefined)
    );
    if (!shouldTrack) {
      setSelectedTracking(null);
      return;
    }

    const run = async () => {
      try {
        const data = await getPedidoTracking(selectedPedido.id);
        if (!cancelled) setSelectedTracking(data);
      } catch {
        if (!cancelled) setSelectedTracking(null);
      }
    };

    void run();
    const interval = window.setInterval(run, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedPedido?.id, selectedPedido?.repartidorId, selectedPedido?.ubicacionLat, selectedPedido?.ubicacionLng]);

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const handleUpdate = async (ventaId: number, next: PedidoEstado) => {
    try {
      setLoading(true);
      await updatePedidoEstado(ventaId, next, motivoRechazo[ventaId]);
      await load(true);
      await loadRepartidores();
      setSnack({ open: true, message: t('Estado actualizado', 'Status updated') });
    } catch (e: any) {
      setError(String(e?.message || t('No se pudo actualizar', 'Could not update')));
    } finally {
      setLoading(false);
    }
  };

  const resumen = useMemo(() => {
    const sinRepartidor = filteredPedidos.filter((pedido) => !pedido.repartidorId).length;
    return { count: filteredPedidos.length, sinRepartidor };
  }, [filteredPedidos]);
  const visiblePedidoNumbers = useMemo(() => buildVisiblePedidoNumbers(pedidos), [pedidos]);
  const getVisiblePedidoLabel = (pedido?: Venta | null) => {
    if (!pedido) return 'Pedido';
    const visibleNumber = pedido.numero ?? visiblePedidoNumbers[pedido.id] ?? pedido.id;
    return `${t('Pedido', 'Order')} ${visibleNumber}`;
  };

  const formatBoletaSerieNumero = (pedido: Venta) => {
    const raw = pedido.numero ?? visiblePedidoNumbers[pedido.id] ?? pedido.id ?? 0;
    return `${boletaEmpresa.serie} - ${String(raw).padStart(6, '0')}`;
  };

  const formatFechaBoleta = (fecha?: string) => {
    if (!fecha) return new Date().toLocaleDateString('en-CA');
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return new Date().toLocaleDateString('en-CA');
    return parsed.toLocaleDateString('en-CA');
  };

  const selectedChip = estadoChip(selectedPedido?.pedidoEstado);
  const selectedUrgency = selectedPedido ? getPedidoUrgency(selectedPedido) : null;
  const selectedMapsUrl = buildMapsUrl(selectedPedido);
  const selectedIsClosed = ['entregado', 'rechazado'].includes(String(selectedPedido?.pedidoEstado || '').toLowerCase());
  const selectedPath = useMemo(
    () => (selectedTracking?.history || []).map((point) => ({ lat: point.lat, lng: point.lng })),
    [selectedTracking?.history]
  );
  const selectedCurrent = useMemo(() => {
    if (selectedTracking?.last) {
      return { lat: selectedTracking.last.lat, lng: selectedTracking.last.lng };
    }
    return null;
  }, [selectedTracking?.last]);
  const selectedDestination = useMemo(() => {
    if (
      selectedTracking?.venta?.ubicacionLat !== null &&
      selectedTracking?.venta?.ubicacionLat !== undefined &&
      selectedTracking?.venta?.ubicacionLng !== null &&
      selectedTracking?.venta?.ubicacionLng !== undefined
    ) {
      return { lat: selectedTracking.venta.ubicacionLat, lng: selectedTracking.venta.ubicacionLng };
    }
    if (
      selectedPedido?.ubicacionLat !== null &&
      selectedPedido?.ubicacionLat !== undefined &&
      selectedPedido?.ubicacionLng !== null &&
      selectedPedido?.ubicacionLng !== undefined
    ) {
      return { lat: selectedPedido.ubicacionLat, lng: selectedPedido.ubicacionLng };
    }
    return null;
  }, [
    selectedPedido?.ubicacionLat,
    selectedPedido?.ubicacionLng,
    selectedTracking?.venta?.ubicacionLat,
    selectedTracking?.venta?.ubicacionLng
  ]);

  const handlePrintPedido = (pedido: Venta) => {
    const clienteNombre = pedido.clienteNombre || 'PUBLICO EN GENERAL';
    const detalleHtml = (pedido.productosVendidos || [])
      .map((item) => {
        const nombre = escapeHtml(item.producto?.nombre || 'Producto');
        const cantidad = Number(item.cantidad || 0);
        const precio = Number(item.producto?.precioVenta || 0);
        const subtotal = cantidad * precio;
        return `
          <tr>
            <td style="border:1px solid #666;padding:4px 6px;font-size:10px;">${nombre}</td>
            <td style="border:1px solid #666;padding:4px 6px;text-align:center;font-size:10px;">${cantidad}</td>
            <td style="border:1px solid #666;padding:4px 6px;text-align:right;font-size:10px;">${formatCurrency(precio)}</td>
            <td style="border:1px solid #666;padding:4px 6px;text-align:right;font-size:10px;">${formatCurrency(subtotal)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <title>Boleta ${escapeHtml(formatBoletaSerieNumero(pedido))}</title>
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
            }
            .doc-num {
              display: block;
              color: #d40000;
              font-size: 11pt;
              font-weight: 800;
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
              line-height: 1.2;
            }
          </style>
        </head>
        <body>
          <div class="boleta-a4">
            <div class="boleta-title-wrap">
              <div class="boleta-title">${escapeHtml(boletaEmpresa.nombre)}</div>
            </div>

            <div class="boleta-top-row">
              <div class="boleta-empresa-box">
                <div><strong>RUC:</strong> ${escapeHtml(boletaEmpresa.ruc)}</div>
                <div><strong>Direccion:</strong> ${escapeHtml(boletaEmpresa.direccion)}</div>
                <div><strong>Telefono:</strong> ${escapeHtml(boletaEmpresa.telefono)}</div>
              </div>

              <div class="boleta-doc-box">
                <div class="doc-ruc">R.U.C. ${escapeHtml(boletaEmpresa.ruc)}</div>
                <div class="doc-type">BOLETA DE VENTA</div>
                <div class="doc-num">${escapeHtml(formatBoletaSerieNumero(pedido))}</div>
              </div>
            </div>

            <div class="boleta-mid-row">
              <div class="boleta-client-box">
                <div><strong>CLIENTE:</strong> ${escapeHtml(clienteNombre)}</div>
                <div><strong>DNI:</strong> ${escapeHtml(pedido.clienteDni || '-')}</div>
                <div><strong>METODO DE PAGO:</strong> ${escapeHtml(formatMetodoPagoLabel(pedido.metodoPago))}</div>
                <div><strong>ID DE VENTA:</strong> ${escapeHtml(pedido.id)}</div>
                <div><strong>FECHA:</strong> ${escapeHtml(formatFechaBoleta(pedido.fecha))}</div>
                <div><strong>DIRECCION:</strong> ${escapeHtml(pedido.direccionEntrega || 'RECOJO EN TIENDA')}</div>
              </div>

              <div class="boleta-logo-box">
                <img src="${escapeHtml(boletaEmpresa.logo)}" alt="Logo Market" />
              </div>
            </div>

            <div class="boleta-section-title">DETALLE DE PRODUCTOS</div>
            <table class="boleta-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>${detalleHtml}</tbody>
            </table>

            <div class="boleta-total-row">
              <div>TOTAL A PAGAR:</div>
              <div>${formatCurrency(pedido.total)}</div>
            </div>

            <div class="boleta-footer">
              Gracias por su compra
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '', 'width=920,height=1100');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDeletePedido = async (pedido: Venta) => {
    const confirmed = window.confirm(`¿Eliminar ${getVisiblePedidoLabel(pedido)} del historial?`);
    if (!confirmed) return;
    try {
      setLoading(true);
      setError('');
      await deleteVentasByIds([pedido.id]);
      if (selectedPedidoId === pedido.id) setSelectedPedidoId(null);
      await load(true);
      setSnack({ open: true, message: t('Pedido eliminado del historial', 'Order removed from history') });
    } catch (e: any) {
      setError(String(e?.message || t('No se pudo eliminar el pedido.', 'Could not delete order.')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <LocalShippingIcon color="primary" />
        <Typography variant="h4" fontWeight={900}>
          {t('Pedidos', 'Orders')}
        </Typography>
        <Chip label={`${resumen.count}`} />
        {historyOpen && <Chip color="default" variant="outlined" label={t('Historial', 'History')} />}
      </Box>

      {'Notification' in window && Notification.permission !== 'granted' && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={requestNotifications}>Activar</Button>}>
          {t('Activa notificaciones para avisar nuevos pedidos.', 'Enable notifications for new orders.')}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2.25, mb: 2 }}>
        <Stack spacing={2}>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            {(historyOpen ? HISTORY_ESTADOS : ACTIVE_ESTADOS).map((itemEstado) => (
              <Button
                key={itemEstado}
                variant={estado === itemEstado ? 'contained' : 'outlined'}
                onClick={() => setEstado(itemEstado)}
              >
                {estadoChip(itemEstado).label}
              </Button>
            ))}
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant={historyOpen ? 'contained' : 'outlined'}
              onClick={() => setHistoryOpen((prev) => !prev)}
            >
              {historyOpen ? t('Volver a operación', 'Back to operations') : t('Historial de pedidos', 'Order history')}
            </Button>
            <Button variant="text" onClick={() => void load(false)} disabled={loading}>
              {t('Actualizar', 'Refresh')}
            </Button>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              label={historyOpen ? t('Buscar en historial', 'Search history') : t('Buscar pedido, cliente o dirección', 'Search order, customer or address')}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            {!historyOpen && (
              <Chip
                clickable
                color={soloSinRepartidor ? 'warning' : 'default'}
                label={`${t('Solo sin repartidor', 'Only unassigned')} (${resumen.sinRepartidor})`}
                onClick={() => setSoloSinRepartidor((prev) => !prev)}
                variant={soloSinRepartidor ? 'filled' : 'outlined'}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      {loading && pedidos.length === 0 ? (
        <Alert severity="info">{t('Cargando...', 'Loading...')}</Alert>
      ) : filteredPedidos.length === 0 ? (
        <Alert severity="info">{t('No hay pedidos para esta vista.', 'No orders for this view.')}</Alert>
      ) : historyOpen ? (
        <Stack spacing={2}>
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Pedido', 'Order')}</TableCell>
                  <TableCell>{t('Ref.', 'Ref.')}</TableCell>
                  <TableCell>{t('Fecha', 'Date')}</TableCell>
                  <TableCell>{t('Cliente', 'Customer')}</TableCell>
                  <TableCell>{t('Estado', 'Status')}</TableCell>
                  <TableCell align="right">{t('Total', 'Total')}</TableCell>
                  <TableCell align="center">{t('Acciones', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPedidos.map((pedido) => {
                  const chip = estadoChip(pedido.pedidoEstado);
                  const isSelected = pedido.id === selectedPedidoId;
                  return (
                    <TableRow
                      key={pedido.id}
                      hover
                      selected={isSelected}
                      onClick={() => setSelectedPedidoId(pedido.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={800}>
                          {getVisiblePedidoLabel(pedido)}
                        </Typography>
                      </TableCell>
                      <TableCell>#{pedido.id}</TableCell>
                      <TableCell>{new Date(pedido.fecha).toLocaleString('es-PE')}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {pedido.clienteNombre || t('Cliente', 'Customer')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pedido.direccionEntrega || t('Recojo en tienda', 'Store pickup')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={chip.label} color={chip.color} />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(pedido.total)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={t('Ver detalle', 'View details')}>
                          <IconButton size="small" color="primary" onClick={() => setSelectedPedidoId(pedido.id)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('Boleta', 'Receipt')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPedido(pedido);
                            }}
                          >
                            <DownloadOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('Eliminar', 'Delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeletePedido(pedido);
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedPedido && (
            <Paper sx={{ p: 2.25, borderRadius: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap" mb={2}>
                <Box>
                  <Typography variant="h5" fontWeight={900}>
                    {getVisiblePedidoLabel(selectedPedido)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {`Ref. interna #${selectedPedido.id} • ${new Date(selectedPedido.fecha).toLocaleString('es-PE')}`}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon fontSize="small" />}
                    onClick={() => handlePrintPedido(selectedPedido)}
                  >
                    {t('Descargar boleta', 'Download receipt')}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => void handleDeletePedido(selectedPedido)}
                  >
                    {t('Eliminar', 'Delete')}
                  </Button>
                </Stack>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1 }}>
                        {t('Cliente', 'Customer')}
                      </Typography>
                      <Typography variant="body2">{selectedPedido.clienteNombre || '—'}</Typography>
                      <Typography variant="body2" color="text.secondary">DNI: {selectedPedido.clienteDni || '—'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('Pago:', 'Payment:')} {formatMetodoPagoLabel(selectedPedido.metodoPago)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1 }}>
                        {t('Entrega', 'Delivery')}
                      </Typography>
                      <Typography variant="body2">
                        {selectedPedido.direccionEntrega || t('Recojo en tienda', 'Store pickup')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('Repartidor:', 'Courier:')} {selectedTracking?.repartidor?.nombreCompleto || (selectedPedido.repartidorId ? `#${selectedPedido.repartidorId}` : t('Sin asignar', 'Unassigned'))}
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {formatCurrency(selectedPedido.total)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1.25 }}>
                        {t('Detalle del pedido', 'Order detail')}
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('Producto', 'Product')}</TableCell>
                            <TableCell align="right">{t('Cantidad', 'Quantity')}</TableCell>
                            <TableCell align="right">{t('Precio', 'Price')}</TableCell>
                            <TableCell align="right">{t('Subtotal', 'Subtotal')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(selectedPedido.productosVendidos || []).map((item, index) => {
                            const cantidad = Number(item.cantidad || 0);
                            const precio = Number(item.producto?.precioVenta || 0);
                            return (
                              <TableRow key={`${selectedPedido.id}-${item.producto?.id || index}`}>
                                <TableCell>{item.producto?.nombre || t('Producto', 'Product')}</TableCell>
                                <TableCell align="right">{cantidad}</TableCell>
                                <TableCell align="right">{formatCurrency(precio)}</TableCell>
                                <TableCell align="right">{formatCurrency(cantidad * precio)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Stack>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Paper
              sx={{
                overflow: 'hidden',
                borderRadius: 3,
                border: '1px solid rgba(15,23,42,0.08)'
              }}
            >
              <Box sx={{ px: 2, py: 1.6, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                <Typography variant="subtitle1" fontWeight={900}>
                  {historyOpen ? t('Historial de pedidos', 'Order history') : t('Lista de pedidos', 'Order list')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {historyOpen
                    ? t('Revisa pedidos cerrados sin mezclarlo con la operación diaria.', 'Review closed orders without mixing them with daily operations.')
                    : t('Selecciona un pedido para atenderlo rápido.', 'Select an order to handle it quickly.')}
                </Typography>
              </Box>

              <List disablePadding sx={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {filteredPedidos.map((pedido) => {
                  const chip = estadoChip(pedido.pedidoEstado);
                  const urgency = getPedidoUrgency(pedido);
                  const minutes = getMinutesSince(pedido.pedidoUpdatedAt || pedido.fecha);
                  const isSelected = pedido.id === selectedPedidoId;
                  return (
                    <ListItemButton
                      key={pedido.id}
                      selected={isSelected}
                      onClick={() => setSelectedPedidoId(pedido.id)}
                      sx={{
                        alignItems: 'flex-start',
                        py: 1.6,
                        borderLeft: `4px solid ${alpha('#1976d2', isSelected ? 1 : 0)}`,
                        bgcolor: isSelected ? alpha('#1976d2', 0.06) : 'transparent'
                      }}
                    >
                      <ListItemText
                        primary={(
                          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.2}>
                            <Typography fontWeight={800}>
                              {getVisiblePedidoLabel(pedido)}
                            </Typography>
                            <Chip size="small" label={chip.label} color={chip.color} />
                          </Box>
                        )}
                        secondary={(
                          <Stack spacing={0.85} sx={{ mt: 0.8 }}>
                            <Typography variant="caption" color="text.secondary">
                              Ref. interna #{pedido.id}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#12253d' }}>
                              {pedido.clienteNombre || `${t('Cliente', 'Customer')} #${pedido.clienteId || '—'}`}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                              {!historyOpen && <Chip size="small" label={urgency.label} color={urgency.color} variant="outlined" />}
                              <Chip size="small" icon={<ScheduleIcon />} label={`${minutes} min`} variant="outlined" />
                              {!historyOpen && (
                                <Chip
                                  size="small"
                                  icon={<DeliveryDiningOutlinedIcon />}
                                  label={pedido.repartidorId ? t('Con repartidor', 'Assigned') : t('Sin repartidor', 'Unassigned')}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {pedido.direccionEntrega || t('Sin dirección registrada', 'No delivery address')}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#10243b' }}>
                              {formatCurrency(pedido.total)} • {pedido.productosVendidos?.length || 0} {t('ítems', 'items')}
                            </Typography>
                          </Stack>
                        )}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            {!selectedPedido ? (
              <Alert severity="info">{t('Selecciona un pedido para ver el detalle.', 'Select an order to view details.')}</Alert>
            ) : (
              <Stack spacing={2}>
                <Paper sx={{ p: 2.25, borderRadius: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="h5" fontWeight={900}>
                          {getVisiblePedidoLabel(selectedPedido)}
                        </Typography>
                        <Chip label={selectedChip.label} color={selectedChip.color} />
                        {!historyOpen && selectedUrgency && (
                          <Chip label={selectedUrgency.label} color={selectedUrgency.color} variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7 }}>
                        {`Ref. interna #${selectedPedido.id} • `}
                        {new Date(selectedPedido.fecha).toLocaleString('es-PE')}
                        {selectedPedido.pedidoUpdatedAt
                          ? ` • ${t('Actualizado:', 'Updated:')} ${new Date(selectedPedido.pedidoUpdatedAt).toLocaleString('es-PE')}`
                          : ''}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedMapsUrl && (
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          onClick={() => window.open(selectedMapsUrl, '_blank', 'noopener,noreferrer')}
                        >
                          {t('Abrir destino', 'Open destination')}
                        </Button>
                      )}
                      <Button size="small" variant="text" onClick={() => void load(false)} disabled={loading}>
                        {t('Refrescar detalle', 'Refresh detail')}
                      </Button>
                      {historyOpen && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadOutlinedIcon fontSize="small" />}
                          onClick={() => handlePrintPedido(selectedPedido)}
                        >
                          {t('Boleta', 'Receipt')}
                        </Button>
                      )}
                    </Stack>
                  </Box>

                  <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack spacing={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <PersonOutlineIcon color="action" fontSize="small" />
                              <Typography variant="subtitle2" fontWeight={800}>
                                {t('Cliente', 'Customer')}
                              </Typography>
                            </Box>
                            <Typography variant="body2">{selectedPedido.clienteNombre || '—'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              DNI: {selectedPedido.clienteDni || '—'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('Pago:', 'Payment:')} {formatMetodoPagoLabel(selectedPedido.metodoPago)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Stack spacing={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <RoomOutlinedIcon color="action" fontSize="small" />
                              <Typography variant="subtitle2" fontWeight={800}>
                                {t('Entrega', 'Delivery')}
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {selectedPedido.direccionEntrega || t('Sin dirección registrada', 'No delivery address')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedPedido.repartidorId
                                ? `${t('Repartidor asignado', 'Assigned courier')}: #${selectedPedido.repartidorId}`
                                : t('Sin repartidor asignado', 'No courier assigned')}
                            </Typography>
                            <Typography variant="body2" fontWeight={800}>
                              {formatCurrency(selectedPedido.total)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>

                <Paper sx={{ p: 2.25, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1.5 }}>
                    {historyOpen ? t('Estado del pedido', 'Order status') : t('Acciones rápidas', 'Quick actions')}
                  </Typography>

                  {historyOpen && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} useFlexGap sx={{ mb: 1.5 }}>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadOutlinedIcon />}
                        onClick={() => handlePrintPedido(selectedPedido)}
                      >
                        {t('Descargar boleta', 'Download receipt')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => void handleDeletePedido(selectedPedido)}
                      >
                        {t('Eliminar', 'Delete')}
                      </Button>
                    </Stack>
                  )}

                  {String(selectedPedido.pedidoEstado || '').toLowerCase() === 'pendiente' && (
                    <Stack spacing={1.5}>
                      <TextField
                        label={t('Motivo de rechazo (opcional)', 'Reject reason (optional)')}
                        fullWidth
                        size="small"
                        value={motivoRechazo[selectedPedido.id] || ''}
                        onChange={(e) => setMotivoRechazo((prev) => ({ ...prev, [selectedPedido.id]: e.target.value }))}
                      />
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} useFlexGap>
                        <Button startIcon={<CheckIcon />} variant="contained" onClick={() => void handleUpdate(selectedPedido.id, 'creando')}>
                          {t('Aceptar y pasar a preparación', 'Accept and move to preparation')}
                        </Button>
                        <Button startIcon={<CloseIcon />} color="error" variant="outlined" onClick={() => void handleUpdate(selectedPedido.id, 'rechazado')}>
                          {t('Rechazar pedido', 'Reject order')}
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {String(selectedPedido.pedidoEstado || '').toLowerCase() === 'creando' && (
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', md: 'center' }}>
                        <TextField
                          size="small"
                          select
                          label={t('Repartidor', 'Courier')}
                          value={asignacion[selectedPedido.id] !== undefined ? asignacion[selectedPedido.id] : (selectedPedido.repartidorId ?? '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAsignacion((prev) => ({ ...prev, [selectedPedido.id]: value === '' ? '' : Number(value) }));
                          }}
                          sx={{ minWidth: 240 }}
                        >
                          <MenuItem value="">
                            {t('Seleccionar', 'Select')}
                          </MenuItem>
                          {repartidores
                            .filter((repartidor: any) => String(repartidor.estado || '').toLowerCase() === 'libre' || Number(selectedPedido.repartidorId) === Number(repartidor.id))
                            .map((repartidor: any) => (
                              <MenuItem key={repartidor.id} value={repartidor.id}>
                                {repartidor.nombreCompleto} {repartidor.motoMatricula ? `(${repartidor.motoMatricula})` : ''}
                              </MenuItem>
                            ))}
                        </TextField>

                        <Button
                          variant="outlined"
                          onClick={async () => {
                            const repartidorId = asignacion[selectedPedido.id] !== undefined
                              ? asignacion[selectedPedido.id]
                              : selectedPedido.repartidorId;
                            if (repartidorId === '' || repartidorId === undefined || repartidorId === null) return;
                            const repartidorIdNum = Number(repartidorId);
                            if (!Number.isInteger(repartidorIdNum) || repartidorIdNum <= 0) return;
                            setLoading(true);
                            setError('');
                            try {
                              const previousRepartidorId = selectedPedido.repartidorId ? Number(selectedPedido.repartidorId) : null;
                              await assignRepartidorToPedido(selectedPedido.id, repartidorIdNum);
                              setRepartidores((prev) =>
                                prev.map((repartidor: any) => {
                                  const currentId = Number(repartidor.id);
                                  if (currentId === repartidorIdNum) {
                                    return { ...repartidor, estado: 'ocupado' };
                                  }
                                  if (previousRepartidorId && previousRepartidorId !== repartidorIdNum && currentId === previousRepartidorId) {
                                    return { ...repartidor, estado: 'libre' };
                                  }
                                  return repartidor;
                                })
                              );
                              await load(true);
                              await loadRepartidores();
                              setSnack({ open: true, message: t('Pedido asignado. Repartidor marcado como ocupado.', 'Order assigned. Courier marked as busy.') });
                            } catch (e: any) {
                              setError(String(e?.message || t('No se pudo asignar', 'Could not assign')));
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={!(asignacion[selectedPedido.id] !== undefined ? asignacion[selectedPedido.id] : selectedPedido.repartidorId)}
                          startIcon={<AssignmentTurnedInOutlinedIcon />}
                        >
                          {t('Guardar asignación', 'Save assignment')}
                        </Button>

                        <Button
                          startIcon={<AutorenewIcon />}
                          variant="contained"
                          onClick={() => void handleUpdate(selectedPedido.id, 'en_camino')}
                        >
                          {t('Marcar en camino', 'Set on the way')}
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {String(selectedPedido.pedidoEstado || '').toLowerCase() === 'en_camino' && (
                    <Button startIcon={<DoneAllIcon />} variant="contained" color="success" onClick={() => void handleUpdate(selectedPedido.id, 'entregado')}>
                      {t('Marcar entregado', 'Set delivered')}
                    </Button>
                  )}

                  {selectedIsClosed && (
                    <Alert severity={String(selectedPedido.pedidoEstado || '').toLowerCase() === 'entregado' ? 'success' : 'warning'} sx={{ mt: 1 }}>
                      {String(selectedPedido.pedidoEstado || '').toLowerCase() === 'entregado'
                        ? t('Este pedido ya fue cerrado como entregado.', 'This order is already closed as delivered.')
                        : `${t('Pedido cerrado.', 'Closed order.')} ${selectedPedido.pedidoRechazoMotivo || ''}`.trim()}
                    </Alert>
                  )}
                </Paper>

                <Grid container spacing={2}>
                  {!historyOpen && (
                    <Grid item xs={12} xl={7}>
                      <Paper sx={{ p: 2.25, borderRadius: 3, height: '100%' }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.2} flexWrap="wrap" sx={{ mb: 1.5 }}>
                          <Typography variant="subtitle1" fontWeight={900}>
                            {t('Mapa y ruta', 'Map and route')}
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              selectedTracking?.last?.at
                                ? `${t('Última señal', 'Last signal')} ${new Date(selectedTracking.last.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                                : t('Sin señal en vivo', 'No live signal')
                            }
                            variant="outlined"
                          />
                        </Box>

                        {(selectedCurrent || selectedDestination || selectedPath.length > 0) ? (
                          <LiveLeafletMap
                            current={selectedCurrent}
                            path={selectedPath}
                            destination={selectedDestination}
                            height={420}
                          />
                        ) : (
                          <Alert severity="info">
                            {t('Todavía no hay ubicación compartida para este pedido.', 'There is no shared location for this order yet.')}
                          </Alert>
                        )}
                      </Paper>
                    </Grid>
                  )}

                  <Grid item xs={12} xl={historyOpen ? 12 : 5}>
                    <Paper sx={{ p: 2.25, borderRadius: 3, height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1.5 }}>
                        {historyOpen ? t('Resumen del pedido', 'Order summary') : t('Detalle del pedido', 'Order details')}
                      </Typography>

                      <Stack spacing={1.25}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('Productos', 'Items')}
                          </Typography>
                          <Stack spacing={1} sx={{ mt: 0.85 }}>
                            {(selectedPedido.productosVendidos || []).map((item, index) => (
                              <Box
                                key={`${selectedPedido.id}-${item.producto?.id || index}`}
                                sx={{
                                  p: 1.25,
                                  borderRadius: 2,
                                  bgcolor: '#fafbfc',
                                  border: '1px solid rgba(15,23,42,0.08)'
                                }}
                              >
                                <Typography variant="body2" fontWeight={700}>
                                  {item.producto?.nombre || t('Producto', 'Product')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.cantidad} x {formatCurrency(item.producto?.precioVenta)}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {historyOpen ? t('Resumen', 'Summary') : t('Resumen operativo', 'Operations summary')}
                          </Typography>
                          <Stack spacing={0.85} sx={{ mt: 0.9 }}>
                            <Typography variant="body2">
                              {t('Tiempo en cola:', 'Queue time:')} <b>{getMinutesSince(selectedPedido.pedidoUpdatedAt || selectedPedido.fecha)} min</b>
                            </Typography>
                            <Typography variant="body2">
                              {t('Repartidor:', 'Courier:')} <b>{selectedTracking?.repartidor?.nombreCompleto || (selectedPedido.repartidorId ? `#${selectedPedido.repartidorId}` : t('Sin asignar', 'Unassigned'))}</b>
                            </Typography>
                            <Typography variant="body2">
                              {t('Total:', 'Total:')} <b>{formatCurrency(selectedPedido.total)}</b>
                            </Typography>
                            {selectedPedido.pedidoRechazoMotivo && (
                              <Typography variant="body2" color="error.main">
                                {t('Motivo:', 'Reason:')} <b>{selectedPedido.pedidoRechazoMotivo}</b>
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={snack.open}
        message={snack.message}
        autoHideDuration={2500}
        onClose={() => setSnack({ open: false, message: '' })}
      />
    </Container>
  );
};

export default PedidosPage;
