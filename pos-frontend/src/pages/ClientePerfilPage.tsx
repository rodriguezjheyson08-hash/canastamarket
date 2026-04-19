import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Grid,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Divider,
  Chip,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import DeliveryDiningOutlinedIcon from '@mui/icons-material/DeliveryDiningOutlined';
import ClienteHeader from '../components/layout/ClienteHeader';
import { useClienteAuth } from '../contexts/ClienteAuthContext';
import { getPedidosCliente, updateCliente } from '../services/clientes';
import { Cliente, Venta } from '../types';
import { useI18n } from '../hooks/useI18n';
import { useNavigate } from 'react-router-dom';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl } from '../utils/geo';
import { useTiendaConfig } from '../hooks/useTiendaConfig';
import { getDeliveryQuote } from '../utils/delivery';
import { cancelPedidoCliente } from '../services/pedidos';
import { useClienteCart } from '../contexts/ClienteCartContext';
import { getPedidoTracking, PedidoTrackingResponse } from '../services/reparto';
import { LiveLeafletMap } from '../components/maps/LiveLeafletMap';

const estadoLabel = (estado?: string | null) => {
  const v = String(estado || '').toLowerCase();
  if (v === 'pendiente') return { label: 'Pendiente', color: 'warning' as const };
  if (v === 'creando') return { label: 'Creando pedido', color: 'info' as const };
  if (v === 'en_camino') return { label: 'En camino', color: 'primary' as const };
  if (v === 'entregado') return { label: 'Entregado', color: 'success' as const };
  if (v === 'rechazado') return { label: 'Rechazado', color: 'error' as const };
  return { label: '—', color: 'default' as const };
};

const estadoClienteLabel = (pedido: Venta) => {
  const motivo = String(pedido.pedidoRechazoMotivo || '').trim().toLowerCase();
  if (String(pedido.pedidoEstado || '').trim().toLowerCase() === 'rechazado' && motivo.includes('cancelado')) {
    return { label: 'Cancelado', color: 'error' as const };
  }
  return estadoLabel(pedido.pedidoEstado);
};

const metodoPagoLabel = (metodo?: string | null) => {
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

const isCancelableByCliente = (pedido: Venta) => {
  const estado = String(pedido.pedidoEstado || '').trim().toLowerCase();
  const metodo = String(pedido.metodoPago || '').trim().toLowerCase();
  const isOnlinePaid = metodo === 'mercadopago' || metodo === 'mercadopago_link';
  return (estado === 'pendiente' || estado === 'creando') && !isOnlinePaid;
};

const getPedidoNumeroMap = (pedidos: Venta[]) => {
  const sorted = [...pedidos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  return sorted.reduce<Record<number, number>>((acc, pedido, index) => {
    acc[pedido.id] = index + 1;
    return acc;
  }, {});
};

const getPedidoStepIndex = (estado?: string | null) => {
  const normalized = String(estado || '').trim().toLowerCase();
  if (normalized === 'pendiente') return 0;
  if (normalized === 'creando') return 1;
  if (normalized === 'en_camino') return 2;
  if (normalized === 'entregado') return 3;
  return -1;
};

const ClientePerfilPage: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  const navigate = useNavigate();
  const { cliente, setCliente } = useClienteAuth();
  const { addItem, count } = useClienteCart();
  const tiendaState = useTiendaConfig();
  const [pedidos, setPedidos] = useState<Venta[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [pedidoActionId, setPedidoActionId] = useState<number | null>(null);
  const [tab, setTab] = useState<'datos' | 'direccion'>('datos');
  const [activeTracking, setActiveTracking] = useState<PedidoTrackingResponse | null>(null);

  const [form, setForm] = useState<{
    nombreCompleto: string;
    telefono: string;
    direccion: string;
    ubicacionLat: string;
    ubicacionLng: string;
  }>({
    nombreCompleto: '',
    telefono: '',
    direccion: '',
    ubicacionLat: '',
    ubicacionLng: ''
  });

  useEffect(() => {
    if (!cliente) return;
    setForm({
      nombreCompleto: cliente.nombreCompleto || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      ubicacionLat: cliente.ubicacionLat !== null && cliente.ubicacionLat !== undefined ? String(cliente.ubicacionLat) : '',
      ubicacionLng: cliente.ubicacionLng !== null && cliente.ubicacionLng !== undefined ? String(cliente.ubicacionLng) : ''
    });
  }, [cliente?.id]);

  useEffect(() => {
    const load = async () => {
      if (!cliente?.id) return;
      setLoadingPedidos(true);
      setError('');
      try {
        const data = await getPedidosCliente(cliente.id);
        setPedidos(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setPedidos([]);
        setError(String(e?.message || t('Error al cargar pedidos', 'Error loading orders')));
      } finally {
        setLoadingPedidos(false);
      }
    };
    load();
  }, [cliente?.id, t]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const hasCoords = useMemo(() => {
    const lat = Number(form.ubicacionLat);
    const lng = Number(form.ubicacionLng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }, [form.ubicacionLat, form.ubicacionLng]);

  const mapsUrl = useMemo(() => {
    if (hasCoords) {
      const lat = Number(form.ubicacionLat);
      const lng = Number(form.ubicacionLng);
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    if (form.direccion.trim()) return buildGoogleMapsSearchUrl(form.direccion);
    return '';
  }, [hasCoords, form.ubicacionLat, form.ubicacionLng, form.direccion]);

  const deliveryQuote = useMemo(() => {
    const tienda = tiendaState.config;
    if (!tienda) return null;
    return getDeliveryQuote({
      tienda: {
        tiendaLat: tienda.tiendaLat,
        tiendaLng: tienda.tiendaLng,
        deliveryEnabled: Boolean(tienda.deliveryEnabled)
      },
      cliente: {
        lat: hasCoords ? Number(form.ubicacionLat) : null,
        lng: hasCoords ? Number(form.ubicacionLng) : null
      },
      subtotal: 0,
      config: {
        deliveryBase: Number(tienda.deliveryBase || 0),
        deliveryPerKm: Number(tienda.deliveryPerKm || 0),
        deliveryIncludedKm: Number(tienda.deliveryIncludedKm || 0),
        deliveryMinFee: Number(tienda.deliveryMinFee || 0),
        deliverySmallOrderThreshold: Number(tienda.deliverySmallOrderThreshold || 0),
        deliverySmallOrderFee: Number(tienda.deliverySmallOrderFee || 0),
        deliveryMaxKm: Number(tienda.deliveryMaxKm || 0)
      }
    });
  }, [
    tiendaState.config,
    hasCoords,
    form.ubicacionLat,
    form.ubicacionLng
  ]);

  const routeUrl = useMemo(() => {
    const tienda = tiendaState.config;
    if (!tienda) return '';
    if (!deliveryQuote?.ok) return '';
    if (tienda.tiendaLat === null || tienda.tiendaLng === null) return '';
    if (!hasCoords) return '';
    return buildGoogleMapsDirectionsUrl(
      { lat: tienda.tiendaLat, lng: tienda.tiendaLng },
      { lat: Number(form.ubicacionLat), lng: Number(form.ubicacionLng) }
    );
  }, [tiendaState.config, deliveryQuote?.ok, hasCoords, form.ubicacionLat, form.ubicacionLng]);

  const handleUseLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError(t('Tu navegador no soporta geolocalización.', 'Your browser does not support geolocation.'));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          ubicacionLat: String(pos.coords.latitude),
          ubicacionLng: String(pos.coords.longitude)
        }));
        setGeoLoading(false);
      },
      () => {
        setError(t('No se pudo obtener tu ubicación. Revisa permisos.', 'Could not get location. Check permissions.'));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSave = async () => {
    if (!cliente?.id) return;
    setSaving(true);
    setError('');
    try {
      const lat = form.ubicacionLat.trim() === '' ? null : Number(form.ubicacionLat);
      const lng = form.ubicacionLng.trim() === '' ? null : Number(form.ubicacionLng);
      const res = await updateCliente(cliente.id, {
        nombreCompleto: form.nombreCompleto.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        ubicacionLat: Number.isFinite(lat as any) ? (lat as number) : null,
        ubicacionLng: Number.isFinite(lng as any) ? (lng as number) : null
      });
      setCliente(res.cliente as Cliente);
    } catch (e: any) {
      setError(String(e?.message || t('No se pudo guardar.', 'Could not save.')));
    } finally {
      setSaving(false);
    }
  };

  const reloadPedidos = async () => {
    if (!cliente?.id) return;
    setLoadingPedidos(true);
    setError('');
    try {
      const data = await getPedidosCliente(cliente.id);
      setPedidos(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setPedidos([]);
      setError(String(e?.message || t('Error al cargar pedidos', 'Error loading orders')));
    } finally {
      setLoadingPedidos(false);
    }
  };

  const handleCancelarPedido = async (pedido: Venta) => {
    if (!cliente?.id) return;
    setPedidoActionId(pedido.id);
    setError('');
    try {
      await cancelPedidoCliente(pedido.id);
      await reloadPedidos();
    } catch (e: any) {
      setError(String(e?.message || t('No se pudo cancelar el pedido.', 'Could not cancel order.')));
    } finally {
      setPedidoActionId(null);
    }
  };

  const handleVolverAPedir = (pedido: Venta) => {
    for (const item of pedido.productosVendidos || []) {
      if (item?.producto) {
        addItem(item.producto, Number(item.cantidad || 1));
      }
    }
    navigate('/checkout');
  };

  const displayName = (form.nombreCompleto || cliente?.nombreCompleto || '').trim() || t('Mi cuenta', 'My account');
  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    const a = parts[0]?.[0] || 'U';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return `${a}${b}`.toUpperCase();
  }, [displayName]);

  const pedidosActivos = useMemo(
    () => pedidos.filter((pedido) => !['entregado', 'rechazado'].includes(String(pedido.pedidoEstado || '').toLowerCase())),
    [pedidos]
  );

  const pedidosEntregados = useMemo(
    () => pedidos.filter((pedido) => String(pedido.pedidoEstado || '').toLowerCase() === 'entregado'),
    [pedidos]
  );

  const totalGastado = useMemo(
    () => pedidos.reduce((acc, pedido) => acc + Number(pedido.total || 0), 0),
    [pedidos]
  );

  const ultimoPedido = pedidos[0] || null;
  const pedidoEnCurso = pedidosActivos[0] || null;
  const pedidoNumeroMap = useMemo(() => getPedidoNumeroMap(pedidos), [pedidos]);
  const getPedidoNumeroCliente = (pedido?: Venta | null) => (pedido ? (pedidoNumeroMap[pedido.id] || pedido.id) : null);
  const hasDireccion = Boolean(form.direccion.trim());
  const hasTelefono = Boolean(form.telefono.trim());
  const currentStatusTitle = pedidoEnCurso
    ? `${t('Pedido en curso', 'Order in progress')} ${getPedidoNumeroCliente(pedidoEnCurso)}`
    : t('Cuenta lista para comprar', 'Account ready to order');
  const currentStatusDescription = pedidoEnCurso
    ? t('Puedes seguir el estado de tu pedido o repetir una compra parecida.', 'You can track your order or repeat a similar purchase.')
    : t('Solo te falta elegir tus productos y confirmar el pedido.', 'You only need to choose your products and confirm the order.');
  const getStatusAccent = (color: string) => {
    if (color === 'warning') return theme.palette.warning.main;
    if (color === 'info') return theme.palette.info.main;
    if (color === 'primary') return theme.palette.primary.main;
    if (color === 'success') return theme.palette.success.main;
    if (color === 'error') return theme.palette.error.main;
    return theme.palette.grey[500];
  };

  const metricCards = [
    {
      label: t('Pedidos', 'Orders'),
      value: loadingPedidos ? '—' : String(pedidos.length),
      helper: t('Total registrados', 'Total registered')
    },
    {
      label: t('Activos', 'Active'),
      value: loadingPedidos ? '—' : String(pedidosActivos.length),
      helper: t('Pendientes o en proceso', 'Pending or in progress')
    },
    {
      label: t('Entregados', 'Delivered'),
      value: loadingPedidos ? '—' : String(pedidosEntregados.length),
      helper: t('Pedidos completados', 'Completed orders')
    },
    {
      label: t('Total gastado', 'Total spent'),
      value: loadingPedidos ? '—' : `S/ ${totalGastado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      helper: t('Histórico acumulado', 'Accumulated history')
    }
  ];

  useEffect(() => {
    if (!pedidoEnCurso?.id) {
      setActiveTracking(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const data = await getPedidoTracking(pedidoEnCurso.id);
        if (!cancelled) setActiveTracking(data);
      } catch {
        if (!cancelled) setActiveTracking(null);
      }
    };
    void run();
    const interval = window.setInterval(run, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pedidoEnCurso?.id]);

  const currentStepIndex = getPedidoStepIndex(pedidoEnCurso?.pedidoEstado);
  const statusSteps = [
    { label: t('Recibido', 'Received') },
    { label: t('Preparando', 'Preparing') },
    { label: t('En camino', 'On the way') },
    { label: t('Entregado', 'Delivered') }
  ];
  const activeCurrentPoint = activeTracking?.last
    ? { lat: Number(activeTracking.last.lat), lng: Number(activeTracking.last.lng) }
    : null;
  const activeDestination =
    activeTracking?.venta?.ubicacionLat !== null &&
    activeTracking?.venta?.ubicacionLat !== undefined &&
    activeTracking?.venta?.ubicacionLng !== null &&
    activeTracking?.venta?.ubicacionLng !== undefined
      ? { lat: Number(activeTracking.venta.ubicacionLat), lng: Number(activeTracking.venta.ubicacionLng) }
      : (
        pedidoEnCurso?.ubicacionLat !== null &&
        pedidoEnCurso?.ubicacionLat !== undefined &&
        pedidoEnCurso?.ubicacionLng !== null &&
        pedidoEnCurso?.ubicacionLng !== undefined
          ? { lat: Number(pedidoEnCurso.ubicacionLat), lng: Number(pedidoEnCurso.ubicacionLng) }
          : null
      );
  const activePath = (activeTracking?.history || []).map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f4f6f8'
      }}
    >
      <ClienteHeader />
      <Box sx={{ position: 'relative', flex: 1 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3 } }}>
          <Paper
            sx={{
              mb: 2.5,
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              bgcolor: '#ffffff',
              border: '1px solid rgba(15,23,42,0.08)',
              boxShadow: '0 6px 18px rgba(15,23,42,0.05)'
            }}
          >
            <Stack spacing={2}>
              <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    fontWeight: 800,
                    fontSize: 24,
                    color: '#0f3d66',
                    bgcolor: '#eaf2fb'
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h5" fontWeight={800} sx={{ color: '#12253d' }}>
                    {displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {cliente?.email || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {pedidoEnCurso
                      ? `${t('Pedido activo', 'Active order')} ${getPedidoNumeroCliente(pedidoEnCurso)} • ${t('ref interna', 'internal ref')} #${pedidoEnCurso.id}`
                      : t('Sin pedidos en curso', 'No active orders')}
                  </Typography>
                </Box>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap>
                <Button
                  variant="contained"
                  startIcon={<StorefrontOutlinedIcon />}
                  onClick={() => navigate('/tienda')}
                  sx={{ boxShadow: 'none' }}
                >
                  {t('Seguir comprando', 'Continue shopping')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={() => {
                    if (pedidoEnCurso) {
                      navigate(`/pedido/${pedidoEnCurso.id}/seguimiento`);
                      return;
                    }
                    navigate('/checkout');
                  }}
                >
                  {pedidoEnCurso ? t('Ver pedido activo', 'View active order') : `${t('Ir al carrito', 'Go to cart')} (${count})`}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {metricCards.map((metric) => (
              <Grid item xs={12} sm={6} lg={3} key={metric.label}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    background: '#ffffff',
                    border: '1px solid rgba(15,23,42,0.06)',
                    boxShadow: '0 4px 12px rgba(15,23,42,0.04)'
                  }}
                >
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      {metric.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#10243b', lineHeight: 1.1 }}>
                      {metric.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {metric.helper}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} lg={4}>
              <Stack spacing={2.5}>
                <Paper
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 2.5,
                    background: '#ffffff',
                    border: '1px solid rgba(15,23,42,0.06)',
                    boxShadow: '0 4px 12px rgba(16,24,40,0.05)'
                  }}
                >
                  <Box
                    sx={{
                      px: 2.4,
                      py: 1.8,
                      borderBottom: '1px solid rgba(15,23,42,0.06)'
                    }}
                  >
                    <Typography variant="overline" sx={{ letterSpacing: 1.2, color: 'text.secondary' }}>
                      {t('Ajustes personales', 'Personal settings')}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ mt: 0.35, color: '#12253d' }}>
                      {t('Tu cuenta', 'Your account')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                      {t('Mantén tus datos listos para comprar más rápido y evitar errores de entrega.', 'Keep your details ready to buy faster and avoid delivery errors.')}
                    </Typography>
                  </Box>

                  <Box sx={{ px: 2.25, py: 2.15 }}>
                    <Stack spacing={1.6}>
                      <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="fullWidth"
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Tab
                          value="datos"
                          label={t('Datos', 'Profile')}
                          sx={{
                            minHeight: 44,
                            fontWeight: 700
                          }}
                        />
                        <Tab
                          value="direccion"
                          label={t('Dirección', 'Address')}
                          sx={{
                            minHeight: 44,
                            fontWeight: 700
                          }}
                        />
                      </Tabs>

                      {tab === 'datos' && (
                        <Stack spacing={1.4} sx={{ pt: 0.8 }}>
                          <TextField
                            label={t('Correo', 'Email')}
                            value={cliente?.email || ''}
                            fullWidth
                            disabled
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.75, bgcolor: '#f7f8fb' } }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <MailOutlineIcon fontSize="small" />
                                </InputAdornment>
                              )
                            }}
                          />
                          <TextField
                            label={t('Nombre completo', 'Full name')}
                            value={form.nombreCompleto}
                            onChange={handleChange('nombreCompleto')}
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.75, bgcolor: '#ffffff' } }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonOutlineIcon fontSize="small" />
                                </InputAdornment>
                              )
                            }}
                          />
                          <TextField
                            label={t('Teléfono', 'Phone')}
                            value={form.telefono}
                            onChange={handleChange('telefono')}
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.75, bgcolor: '#ffffff' } }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PhoneIcon fontSize="small" />
                                </InputAdornment>
                              )
                            }}
                          />
                        </Stack>
                      )}

                      {tab === 'direccion' && (
                        <Stack spacing={1.3} sx={{ pt: 0.8 }}>
                          <TextField
                            label={t('Dirección de entrega', 'Delivery address')}
                            value={form.direccion}
                            onChange={handleChange('direccion')}
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder={t('Ej: Trujillo, La Libertad, Calle 9 #123 (referencia: ...)', 'Example: City, neighborhood, street and reference')}
                            helperText={t('Escribe tu dirección completa con una referencia clara para el repartidor.', 'Write your full address with a clear reference for the delivery driver.')}
                            sx={{
                              '& .MuiOutlinedInput-root': { borderRadius: 2.75, bgcolor: '#ffffff', alignItems: 'flex-start' }
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start" sx={{ mt: 0.8 }}>
                                  <HomeOutlinedIcon fontSize="small" />
                                </InputAdornment>
                              )
                            }}
                          />
                          <Box display="flex" gap={1} flexWrap="wrap">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => window.open(buildGoogleMapsSearchUrl(form.direccion), '_blank', 'noopener,noreferrer')}
                              disabled={!hasDireccion}
                            >
                              {t('Ver en Maps', 'View in Maps')}
                            </Button>
                            <Button size="small" variant="outlined" onClick={handleUseLocation} disabled={geoLoading}>
                              {geoLoading ? t('Obteniendo...', 'Getting...') : t('Usar mi ubicación', 'Use my location')}
                            </Button>
                            {hasCoords && (
                              <Button
                                size="small"
                                variant="text"
                                color="error"
                                onClick={() => setForm(prev => ({ ...prev, ubicacionLat: '', ubicacionLng: '' }))}
                              >
                                {t('Borrar ubicación', 'Clear location')}
                              </Button>
                            )}
                          </Box>
                          {hasCoords && (
                            <Alert severity="success" sx={{ borderRadius: 2.5 }}>
                              {t('Ubicación lista para el delivery.', 'Location ready for delivery.')}
                            </Alert>
                          )}
                        </Stack>
                      )}

                      <Divider sx={{ my: 0.2 }} />

                      <Button fullWidth variant="contained" onClick={handleSave} disabled={saving} sx={{ py: 1.2, borderRadius: 2.5 }}>
                        {saving ? t('Guardando...', 'Saving...') : t('Guardar cambios', 'Save changes')}
                      </Button>
                    </Stack>
                  </Box>
                </Paper>

                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    background: '#ffffff',
                    border: '1px solid rgba(15,23,42,0.06)',
                    boxShadow: '0 8px 24px rgba(16,24,40,0.06)'
                  }}
                >
                  <Stack spacing={1.45}>
                    <Box>
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.4 }}>
                        {t('Logística', 'Logistics')}
                      </Typography>
                      <Typography variant="h6" fontWeight={900}>
                        {t('Estado de delivery', 'Delivery status')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.55 }}>
                        {t('Verifica si tu ubicación ya está lista para recibir pedidos.', 'Check whether your location is ready to receive orders.')}
                      </Typography>
                    </Box>

                    {tiendaState.loading && (
                      <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                        {t('Cargando cálculo de delivery...', 'Loading delivery quote...')}
                      </Alert>
                    )}
                    {!tiendaState.loading && tiendaState.error && (
                      <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
                        {tiendaState.error}
                      </Alert>
                    )}

                    {!tiendaState.loading && tiendaState.config?.deliveryEnabled && (
                      <>
                        {deliveryQuote?.ok ? (
                          <Stack spacing={1.3}>
                            <Box
                              sx={{
                                p: 1.7,
                                borderRadius: 3,
                                bgcolor: alpha(theme.palette.success.main, 0.08),
                                border: `1px solid ${alpha(theme.palette.success.main, 0.16)}`
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.5 }}>
                                {t('Estimado actual de delivery', 'Current delivery estimate')}
                              </Typography>
                              <Typography variant="h5" fontWeight={900} sx={{ mt: 0.35 }}>
                                S/ {Number(deliveryQuote.fee || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip icon={<RouteOutlinedIcon />} label={`${deliveryQuote.distanceKm} km`} variant="outlined" />
                              <Chip icon={<AccessTimeOutlinedIcon />} label={t('Ubicación válida', 'Valid location')} color="success" variant="outlined" />
                            </Stack>
                            {deliveryQuote.breakdown && (
                              <Typography variant="caption" color="text.secondary">
                                {t('Fórmula:', 'Formula:')}{' '}
                                {`base (${deliveryQuote.breakdown.base}) + por km (${deliveryQuote.breakdown.perKm}) × (km - incluye ${deliveryQuote.breakdown.includedKm})`}
                                {deliveryQuote.breakdown.smallOrderFee > 0 ? ` + recargo (${deliveryQuote.breakdown.smallOrderFee})` : ''}
                                {deliveryQuote.breakdown.minFeeApplied ? ` • ${t('se aplicó mínimo', 'min applied')}` : ''}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {routeUrl && (
                                <Button size="small" variant="outlined" onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}>
                                  {t('Ver ruta', 'View route')}
                                </Button>
                              )}
                              {mapsUrl && (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                                  endIcon={<OpenInNewIcon fontSize="small" />}
                                >
                                  {t('Abrir en Maps', 'Open in Maps')}
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        ) : (
                          <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
                            {deliveryQuote?.message || t('No se pudo calcular.', 'Could not calculate.')}
                          </Alert>
                        )}
                      </>
                    )}

                    {!tiendaState.loading && !tiendaState.config?.deliveryEnabled && (
                      <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                        {t('El delivery no está habilitado en este momento.', 'Delivery is not enabled right now.')}
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={8}>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper
                      sx={{
                        minHeight: 204,
                        p: 2.25,
                        borderRadius: 3,
                        background: '#ffffff',
                        border: '1px solid rgba(15,23,42,0.06)',
                        boxShadow: '0 8px 24px rgba(16,24,40,0.06)'
                      }}
                    >
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.4 }}>
                        {t('Actividad reciente', 'Recent activity')}
                      </Typography>
                      {ultimoPedido ? (
                        <Stack spacing={1.15} sx={{ mt: 1 }}>
                          <Typography variant="h5" fontWeight={900} sx={{ color: '#14243a' }}>
                            {t('Último pedido', 'Last order')} {getPedidoNumeroCliente(ultimoPedido)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(ultimoPedido.fecha).toLocaleString('es-PE')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('Referencia interna', 'Internal reference')} #{ultimoPedido.id}
                          </Typography>
                          <Chip
                            size="small"
                            label={estadoClienteLabel(ultimoPedido).label}
                            color={estadoClienteLabel(ultimoPedido).color}
                            sx={{ alignSelf: 'flex-start' }}
                          />
                          <Typography variant="body2">
                            {t('Monto:', 'Amount:')} <b>S/ {Number(ultimoPedido.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('Método usado:', 'Payment used:')} {metodoPagoLabel(ultimoPedido.metodoPago)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack spacing={1.2} sx={{ mt: 1.4 }}>
                          <Typography variant="h6" fontWeight={900}>
                            {t('Aún no hay movimiento', 'No activity yet')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('Cuando hagas tu primer pedido, aquí verás un resumen rápido con fecha, monto y estado.', 'Once you place your first order, you will see a quick summary with date, amount and status here.')}
                          </Typography>
                        </Stack>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper
                      sx={{
                        minHeight: 204,
                        p: 2.25,
                        borderRadius: 3,
                        color: '#10243b',
                        background: '#ffffff',
                        border: '1px solid rgba(15,23,42,0.06)',
                        boxShadow: '0 8px 24px rgba(16,24,40,0.06)'
                      }}
                    >
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.4 }}>
                        {t('Tu estado actual', 'Your current status')}
                      </Typography>
                      <Stack spacing={1.15} sx={{ mt: 1 }}>
                        <Typography variant="h5" fontWeight={900}>
                          {currentStatusTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {currentStatusDescription}
                        </Typography>
                        {pedidoEnCurso && (
                          <Typography variant="caption" color="text.secondary">
                            {t('Referencia interna', 'Internal reference')} #{pedidoEnCurso.id}
                            {activeTracking?.repartidor?.nombreCompleto ? ` • ${t('Repartidor', 'Courier')}: ${activeTracking.repartidor.nombreCompleto}` : ''}
                            {activeTracking?.last?.at ? ` • ${t('Última señal', 'Last signal')}: ${new Date(activeTracking.last.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.6 }}>
                          <Chip
                            icon={<ShoppingBagOutlinedIcon />}
                            label={`${count} ${t('en carrito', 'in cart')}`}
                            variant="outlined"
                          />
                          <Chip
                            icon={<HomeOutlinedIcon />}
                            label={hasDireccion ? t('Dirección lista', 'Address ready') : t('Falta dirección', 'Address missing')}
                            color={hasDireccion ? 'success' : 'default'}
                            variant="outlined"
                          />
                          <Chip
                            icon={<PhoneIcon />}
                            label={hasTelefono ? t('Contacto listo', 'Contact ready') : t('Falta teléfono', 'Phone missing')}
                            color={hasTelefono ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </Stack>
                        {pedidoEnCurso && (
                          <>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.35 }}>
                              {statusSteps.map((step, index) => (
                                <Chip
                                  key={step.label}
                                  size="small"
                                  icon={<DeliveryDiningOutlinedIcon />}
                                  label={step.label}
                                  color={currentStepIndex >= index ? 'primary' : 'default'}
                                  variant={currentStepIndex >= index ? 'filled' : 'outlined'}
                                />
                              ))}
                            </Stack>

                            {(activeCurrentPoint || activeDestination || activePath.length > 0) && (
                              <Box sx={{ pt: 0.8 }}>
                                <LiveLeafletMap
                                  current={activeCurrentPoint}
                                  destination={activeDestination}
                                  path={activePath}
                                  height={240}
                                />
                              </Box>
                            )}

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => navigate(`/pedido/${pedidoEnCurso.id}/seguimiento`)}
                              >
                                {t('Seguir en vivo', 'Track live')}
                              </Button>
                              {pedidoEnCurso.direccionEntrega && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => window.open(buildGoogleMapsSearchUrl(String(pedidoEnCurso.direccionEntrega || '')), '_blank', 'noopener,noreferrer')}
                                >
                                  {t('Abrir destino', 'Open destination')}
                                </Button>
                              )}
                            </Stack>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>

                <Paper
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 3,
                    p: { xs: 2, md: 2.5 },
                    background: '#ffffff',
                    border: '1px solid rgba(15,23,42,0.06)',
                    boxShadow: '0 8px 24px rgba(16,24,40,0.06)'
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
                        {t('Historial de compras', 'Purchase history')}
                      </Typography>
                      <Typography variant="h4" fontWeight={900} sx={{ color: '#12253d' }}>
                        {t('Mis pedidos', 'My orders')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                        {t('Consulta estado, ruta, productos y acciones rápidas desde un mismo panel.', 'Check status, route, products and quick actions from a single panel.')}
                      </Typography>
                    </Box>
                    <Chip
                      label={loadingPedidos ? '—' : `${pedidos.length} ${t('pedidos', 'orders')}`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {!loadingPedidos && pedidos.length === 0 && (
                    <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                      {t('Aún no tienes pedidos.', 'You have no orders yet.')}
                    </Alert>
                  )}

                  {loadingPedidos ? (
                    <Stack spacing={1.5}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                            <Skeleton variant="text" width={180} />
                            <Skeleton variant="rounded" width={90} height={24} />
                          </Box>
                          <Skeleton variant="text" width="60%" />
                          <Skeleton variant="text" width="45%" />
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Stack spacing={1.6}>
                      {pedidos.map((p) => {
                        const estado = estadoClienteLabel(p);
                        const estadoAccent = getStatusAccent(estado.color);
                        const updated = p.pedidoUpdatedAt ? new Date(p.pedidoUpdatedAt).toLocaleString('es-PE') : null;
                        const fecha = new Date(p.fecha).toLocaleString('es-PE');
                        const canTrack =
                          (String(p.pedidoEstado || '').toLowerCase() === 'en_camino' ||
                            String(p.pedidoEstado || '').toLowerCase() === 'creando') &&
                          (p.ubicacionLat !== null &&
                            p.ubicacionLat !== undefined &&
                            p.ubicacionLng !== null &&
                            p.ubicacionLng !== undefined);
                        const canOpenMaps = Boolean(String(p.direccionEntrega || '').trim());
                        return (
                          <Paper
                            key={p.id}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 2.75,
                              borderColor: alpha(estadoAccent, 0.16),
                              background: '#ffffff',
                              boxShadow: 'none'
                            }}
                          >
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={8}>
                                <Box
                                  sx={{
                                    pl: 1.6,
                                    borderLeft: `4px solid ${estadoAccent}`
                                  }}
                                >
                                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                    <Typography fontWeight={900} sx={{ color: '#12253d' }}>
                                      {t('Pedido', 'Order')} {getPedidoNumeroCliente(p)}
                                    </Typography>
                                    <Chip size="small" label={estado.label} color={estado.color} />
                                    <Typography variant="body2" color="text.secondary">
                                      S/ {Number(p.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </Box>

                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                                    {fecha} {updated ? `• ${t('Actualizado:', 'Updated:')} ${updated}` : ''}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.4, display: 'block' }}>
                                    {t('Referencia interna', 'Internal reference')} #{p.id}
                                  </Typography>

                                  {p.direccionEntrega && (
                                    <Typography variant="body2" sx={{ mt: 1.15 }}>
                                      <b>{t('Entrega:', 'Delivery:')}</b> {p.direccionEntrega}
                                    </Typography>
                                  )}

                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.85 }}>
                                    <b>{t('Pago:', 'Payment:')}</b>{' '}
                                    {['mercadopago', 'mercadopago_link'].includes(String(p.metodoPago || '').toLowerCase())
                                      ? t('Pagado online', 'Paid online')
                                      : String(p.metodoPago || '').toLowerCase() === 'efectivo_contra_entrega'
                                        ? t('Pagas al recibir', 'Pay on delivery')
                                        : String(p.metodoPago || '').toLowerCase() === 'efectivo_al_recojo'
                                          ? t('Pagas al recoger', 'Pay on pickup')
                                          : metodoPagoLabel(p.metodoPago)}
                                  </Typography>

                                  {!!p.productosVendidos?.length && (
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                                      {p.productosVendidos.slice(0, 3).map((item, index) => (
                                        <Chip
                                          key={`${p.id}-${item.producto?.id || index}`}
                                          size="small"
                                          variant="outlined"
                                          label={`${item.cantidad} x ${item.producto?.nombre || t('Producto', 'Product')}`}
                                        />
                                      ))}
                                      {p.productosVendidos.length > 3 && (
                                        <Chip size="small" label={`+${p.productosVendidos.length - 3}`} />
                                      )}
                                    </Stack>
                                  )}

                                  {p.pedidoEstado === 'rechazado' && p.pedidoRechazoMotivo && (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                      {t('Motivo:', 'Reason:')} {p.pedidoRechazoMotivo}
                                    </Typography>
                                  )}
                                </Box>
                              </Grid>

                              <Grid item xs={12} md={4}>
                                <Box
                                  sx={{
                                    height: '100%',
                                    p: 1.5,
                                    borderRadius: 2.25,
                                    bgcolor: '#fafbfc',
                                    border: `1px solid ${alpha(estadoAccent, 0.10)}`
                                  }}
                                >
                                  <Stack spacing={1} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                                    <Tooltip title={t('Método de pago', 'Payment method')}>
                                      <Chip size="small" variant="outlined" label={metodoPagoLabel(p.metodoPago)} />
                                    </Tooltip>
                                    {canOpenMaps && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => window.open(buildGoogleMapsSearchUrl(String(p.direccionEntrega || '')), '_blank', 'noopener,noreferrer')}
                                      >
                                        {t('Ver mapa', 'Map')}
                                      </Button>
                                    )}
                                    {canTrack && (
                                      <Button size="small" variant="contained" onClick={() => navigate(`/pedido/${p.id}/seguimiento`)}>
                                        {t('Seguimiento', 'Track')}
                                      </Button>
                                    )}
                                    <Button size="small" variant="outlined" onClick={() => handleVolverAPedir(p)}>
                                      {t('Volver a pedir', 'Order again')}
                                    </Button>
                                    {isCancelableByCliente(p) && (
                                      <Button
                                        size="small"
                                        color="error"
                                        variant="text"
                                        disabled={pedidoActionId === p.id}
                                        onClick={() => void handleCancelarPedido(p)}
                                      >
                                        {pedidoActionId === p.id
                                          ? t('Cancelando...', 'Cancelling...')
                                          : t('Cancelar pedido', 'Cancel order')}
                                      </Button>
                                    )}
                                  </Stack>
                                </Box>
                              </Grid>
                            </Grid>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default ClientePerfilPage;
