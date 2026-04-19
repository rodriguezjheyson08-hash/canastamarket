import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
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
  Typography
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PlaceIcon from '@mui/icons-material/Place';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { useAuth } from '../contexts/AuthContext';
import { LiveLeafletMap } from '../components/maps/LiveLeafletMap';
import {
  getPedidoTracking,
  getRepartidorDashboard,
  RepartidorDashboardResponse,
  reportRepartidorUbicacion,
  updateRepartidorEstado,
  updateRepartidorPerfil
} from '../services/reparto';
import { updatePedidoEstado } from '../services/pedidos';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl } from '../utils/geo';

type LatLng = { lat: number; lng: number };

const formatCurrency = (value?: number | null) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const estadoChipColor = (estado?: string | null) => {
  const current = String(estado || '').toLowerCase();
  if (current === 'libre') return 'success' as const;
  if (current === 'ocupado') return 'warning' as const;
  if (current === 'inactivo') return 'default' as const;
  if (current === 'en_camino') return 'primary' as const;
  if (current === 'creando') return 'info' as const;
  if (current === 'entregado') return 'success' as const;
  if (current === 'rechazado') return 'error' as const;
  return 'default' as const;
};

const formatPedidoEstado = (estado?: string | null) => {
  const current = String(estado || '').toLowerCase();
  if (current === 'creando') return 'Preparando';
  if (current === 'en_camino') return 'En camino';
  if (current === 'entregado') return 'Entregado';
  if (current === 'rechazado') return 'Rechazado';
  if (current === 'pendiente') return 'Pendiente';
  return '—';
};

const formatMetodoPago = (metodo?: string | null) => {
  const current = String(metodo || '').toLowerCase();
  if (current === 'efectivo_contra_entrega') return 'Efectivo al recibir';
  if (current === 'efectivo_al_recojo') return 'Efectivo al recoger';
  if (current === 'mercadopago' || current === 'mercadopago_link') return 'Mercado Pago';
  if (current === 'yape') return 'Yape';
  if (current === 'tarjeta') return 'Tarjeta';
  if (current === 'efectivo') return 'Efectivo';
  return metodo || '—';
};

const formatPhoneHref = (phone?: string | null) => {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  return clean || '';
};

const formatWhatsAppHref = (phone?: string | null) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
};

const RepartidorPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const repartidorId = user?.id ? Number(user.id) : null;
  const isRepartidor = String(user?.rol || '').toUpperCase() === 'REPARTIDOR';

  const [dashboard, setDashboard] = useState<RepartidorDashboardResponse | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tracking, setTracking] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const [pos, setPos] = useState<LatLng | null>(null);
  const [profileForm, setProfileForm] = useState({
    nombreCompleto: '',
    telefono: '',
    motoMatricula: '',
    password: ''
  });

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const autoStartedVentaRef = useRef<number | null>(null);

  const venta = dashboard?.ventaActiva || null;
  const repartidor = dashboard?.repartidor || null;
  const stats = dashboard?.stats || {
    entregados: 0,
    rechazados: 0,
    activos: 0,
    montoEntregado: 0,
    montoHoy: 0,
    entregadosHoy: 0
  };
  const historial = dashboard?.historial || [];

  useEffect(() => {
    setProfileForm({
      nombreCompleto: repartidor?.nombreCompleto || user?.nombreCompleto || '',
      telefono: repartidor?.telefono || user?.telefono || '',
      motoMatricula: repartidor?.motoMatricula || '',
      password: ''
    });
  }, [repartidor?.id, repartidor?.nombreCompleto, repartidor?.telefono, repartidor?.motoMatricula, user?.nombreCompleto, user?.telefono]);

  const destino = useMemo<LatLng | null>(() => {
    const lat = Number(venta?.ubicacionLat);
    const lng = Number(venta?.ubicacionLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [venta?.ubicacionLat, venta?.ubicacionLng]);

  const destinoQuery = useMemo(() => {
    const value = String(venta?.direccionEntrega || '').trim();
    return value || null;
  }, [venta?.direccionEntrega]);

  const currentPoint = useMemo<LatLng | null>(() => {
    if (pos) return pos;
    const last = trackingInfo?.last;
    if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) {
      return { lat: Number(last.lat), lng: Number(last.lng) };
    }
    if (repartidor && Number.isFinite(Number(repartidor.lastLat)) && Number.isFinite(Number(repartidor.lastLng))) {
      return { lat: Number(repartidor.lastLat), lng: Number(repartidor.lastLng) };
    }
    return null;
  }, [pos, trackingInfo?.last, repartidor]);

  const path = useMemo<LatLng[]>(() => {
    const list: LatLng[] = [];
    const history = trackingInfo?.history || [];
    history.forEach((point: any) => {
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) list.push({ lat, lng });
    });
    if (pos) {
      const tail = list[list.length - 1];
      if (!tail || Math.abs(tail.lat - pos.lat) > 1e-7 || Math.abs(tail.lng - pos.lng) > 1e-7) {
        list.push(pos);
      }
    }
    return list;
  }, [trackingInfo?.history, pos]);

  const routeUrl = useMemo(() => {
    if (currentPoint && destino) return buildGoogleMapsDirectionsUrl(currentPoint, destino);
    if (destinoQuery) return buildGoogleMapsSearchUrl(destinoQuery);
    return '';
  }, [currentPoint, destino, destinoQuery]);

  const clienteTelefonoHref = formatPhoneHref(venta?.clienteTelefono);
  const clienteWhatsAppHref = formatWhatsAppHref(venta?.clienteTelefono);

  const load = async (silent = false) => {
    if (!repartidorId) return;
    if (!silent) setLoading(true);
    setErr('');
    try {
      const data = await getRepartidorDashboard(repartidorId);
      setDashboard(data);
      if (data?.ventaActiva?.id) {
        const tracking = await getPedidoTracking(Number(data.ventaActiva.id));
        setTrackingInfo(tracking);
      } else {
        setTrackingInfo(null);
      }
    } catch (e: any) {
      setDashboard(null);
      setTrackingInfo(null);
      setErr(String(e?.message || 'No se pudo cargar el dashboard del repartidor.'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repartidorId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load(true);
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repartidorId]);

  const stopGeo = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  const startGeo = () => {
    setErr('');
    if (!navigator.geolocation) {
      setErr('Tu navegador no soporta geolocalización.');
      return;
    }
    if (!repartidorId) return;
    if (watchIdRef.current !== null) return;

    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPos(next);
        const now = Date.now();
        if (now - lastSentRef.current < 2500) return;
        lastSentRef.current = now;
        void reportRepartidorUbicacion({
          repartidorId,
          lat: next.lat,
          lng: next.lng,
          ventaId: venta?.id ? Number(venta.id) : null
        }).then(() => {
          void load(true);
        }).catch(() => {});
      },
      () => {
        setErr('No se pudo obtener tu ubicación. Revisa permisos.');
        stopGeo();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  useEffect(() => {
    return () => stopGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const estado = String(venta?.pedidoEstado || '').toLowerCase();
    if (!venta?.id || !['creando', 'en_camino'].includes(estado)) return;
    if (tracking) return;
    if (autoStartedVentaRef.current === Number(venta.id)) return;
    autoStartedVentaRef.current = Number(venta.id);
    startGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venta?.id, venta?.pedidoEstado, tracking]);

  const handleUpdateStatus = async (estado: 'libre' | 'ocupado' | 'inactivo') => {
    if (!repartidorId) return;
    setStatusSaving(true);
    setErr('');
    try {
      await updateRepartidorEstado(repartidorId, estado);
      await load(true);
      setSnack(`Estado actualizado a ${estado}.`);
    } catch (e: any) {
      setErr(String(e?.message || 'No se pudo actualizar el estado.'));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    if (field === 'telefono') {
      setProfileForm((prev) => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 9) }));
      return;
    }
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!repartidorId) return;
    if (!profileForm.nombreCompleto.trim()) {
      setErr('El nombre completo es obligatorio.');
      return;
    }
    if (profileForm.telefono && !/^\d{9}$/.test(profileForm.telefono)) {
      setErr('El teléfono debe tener 9 dígitos.');
      return;
    }
    setProfileSaving(true);
    setErr('');
    try {
      const updated = await updateRepartidorPerfil(repartidorId, {
        nombreCompleto: profileForm.nombreCompleto.trim(),
        telefono: profileForm.telefono.trim() || null,
        motoMatricula: profileForm.motoMatricula.trim() || null,
        password: profileForm.password.trim() || undefined
      });
      setDashboard((prev) => (prev ? { ...prev, repartidor: updated } : prev));
      updateUser({
        ...user!,
        nombreCompleto: updated.nombreCompleto,
        telefono: updated.telefono || undefined
      });
      setProfileForm((prev) => ({ ...prev, password: '' }));
      setProfileOpen(false);
      setSnack('Perfil actualizado.');
    } catch (e: any) {
      setErr(String(e?.message || 'No se pudo actualizar el perfil.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleIniciar = async () => {
    if (!venta?.id) return;
    setLoading(true);
    setErr('');
    try {
      await updatePedidoEstado(Number(venta.id), 'en_camino');
      await load(true);
      setSnack('Entrega iniciada.');
    } catch (e: any) {
      setErr(String(e?.message || 'No se pudo iniciar la entrega.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    if (!venta?.id) return;
    setLoading(true);
    setErr('');
    try {
      await updatePedidoEstado(Number(venta.id), 'entregado');
      stopGeo();
      await load(true);
      setSnack('Entrega finalizada.');
    } catch (e: any) {
      setErr(String(e?.message || 'No se pudo finalizar la entrega.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isRepartidor) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Este panel es solo para usuarios con rol REPARTIDOR.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={2.5}>
        <Paper sx={{ p: 2.5, borderRadius: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} lg={7}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={repartidor?.fotoUrl || user?.fotoUrl} sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}>
                  {(repartidor?.nombreCompleto || user?.nombreCompleto || user?.nombreUsuario || 'R').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="h4" fontWeight={900}>
                      Dashboard Repartidor
                    </Typography>
                    <Chip color={estadoChipColor(repartidor?.estado)} label={String(repartidor?.estado || 'libre').toUpperCase()} />
                  </Stack>
                  <Typography variant="h6" fontWeight={800} sx={{ mt: 0.6 }}>
                    {repartidor?.nombreCompleto || user?.nombreCompleto || user?.nombreUsuario}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
                    <Chip size="small" icon={<PhoneIcon />} label={repartidor?.telefono || 'Sin teléfono'} variant="outlined" />
                    <Chip size="small" icon={<TwoWheelerOutlinedIcon />} label={repartidor?.motoMatricula || 'Sin moto registrada'} variant="outlined" />
                    <Chip size="small" icon={<BadgeOutlinedIcon />} label={repartidor?.dni || 'Sin DNI'} variant="outlined" />
                  </Stack>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                <Button
                  startIcon={<EditOutlinedIcon />}
                  variant={profileOpen ? 'contained' : 'outlined'}
                  onClick={() => setProfileOpen((prev) => !prev)}
                >
                  {profileOpen ? 'Cerrar perfil' : 'Editar perfil'}
                </Button>
                <Button
                  startIcon={<MyLocationIcon />}
                  variant={tracking ? 'contained' : 'outlined'}
                  color={tracking ? 'success' : 'primary'}
                  onClick={tracking ? stopGeo : startGeo}
                >
                  {tracking ? 'Detener ubicación' : 'Activar ubicación'}
                </Button>
                {routeUrl && (
                  <Button
                    startIcon={<RouteOutlinedIcon />}
                    variant="outlined"
                    onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Abrir ruta
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>

          {profileOpen && (
            <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Nombre completo"
                    value={profileForm.nombreCompleto}
                    onChange={(e) => handleProfileChange('nombreCompleto', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Celular"
                    value={profileForm.telefono}
                    onChange={(e) => handleProfileChange('telefono', e.target.value)}
                    inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Moto / placa"
                    value={profileForm.motoMatricula}
                    onChange={(e) => handleProfileChange('motoMatricula', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Nueva clave"
                    type="password"
                    value={profileForm.password}
                    onChange={(e) => handleProfileChange('password', e.target.value)}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
                <Button
                  startIcon={<SaveOutlinedIcon />}
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                >
                  Guardar perfil
                </Button>
                <Button variant="outlined" onClick={() => setProfileOpen(false)} disabled={profileSaving}>
                  Cancelar
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>

        {err && <Alert severity="error">{err}</Alert>}
        {loading && !dashboard && <Alert severity="info">Cargando dashboard…</Alert>}

        {!loading || dashboard ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} xl={3}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Entregados</Typography>
                    <Typography variant="h4" fontWeight={900}>{stats.entregados}</Typography>
                    <Chip size="small" icon={<TaskAltOutlinedIcon />} label={`${stats.entregadosHoy} hoy`} variant="outlined" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} xl={3}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Asignaciones activas</Typography>
                    <Typography variant="h4" fontWeight={900}>{stats.activos}</Typography>
                    <Chip size="small" icon={<LocalShippingIcon />} label={venta ? 'Tienes pedido asignado' : 'Sin pedido activo'} variant="outlined" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} xl={3}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Monto entregado</Typography>
                    <Typography variant="h5" fontWeight={900}>{formatCurrency(stats.montoEntregado)}</Typography>
                    <Chip size="small" icon={<MonetizationOnOutlinedIcon />} label={`Hoy ${formatCurrency(stats.montoHoy)}`} variant="outlined" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} xl={3}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Historial</Typography>
                    <Typography variant="h4" fontWeight={900}>{historial.length}</Typography>
                    <Chip size="small" icon={<HistoryOutlinedIcon />} label={`${stats.rechazados} rechazados`} variant="outlined" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} lg={5}>
                <Paper sx={{ p: 2.25, borderRadius: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
                    Mis asignaciones
                  </Typography>

                  {venta ? (
                    <Stack spacing={1.5}>
                      <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: '#fafbfc', border: '1px solid rgba(15,23,42,0.08)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                          <Box>
                            <Typography variant="h6" fontWeight={900}>
                              Pedido #{venta.id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatPedidoEstado(venta.pedidoEstado)}
                            </Typography>
                          </Box>
                          <Chip color={estadoChipColor(venta.pedidoEstado)} label={formatPedidoEstado(venta.pedidoEstado).toUpperCase()} />
                        </Stack>
                      </Box>

                      <Stack spacing={1}>
                        <Typography variant="body2"><b>Cliente:</b> {venta.clienteNombre || 'Sin nombre'}</Typography>
                        <Typography variant="body2"><b>Teléfono:</b> {venta.clienteTelefono || '—'}</Typography>
                        <Typography variant="body2"><b>Entrega:</b> {venta.direccionEntrega || venta.clienteDireccionPerfil || 'Sin dirección'}</Typography>
                        <Typography variant="body2"><b>Método de pago:</b> {formatMetodoPago(venta.metodoPago)}</Typography>
                        <Typography variant="body2"><b>Total:</b> {formatCurrency(venta.total)}</Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {venta.clienteTelefono && clienteTelefonoHref && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PhoneIcon />}
                            onClick={() => window.open(`tel:${clienteTelefonoHref}`, '_self')}
                          >
                            Llamar
                          </Button>
                        )}
                        {venta.clienteTelefono && clienteWhatsAppHref && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<WhatsAppIcon />}
                            onClick={() => window.open(clienteWhatsAppHref, '_blank', 'noopener,noreferrer')}
                          >
                            WhatsApp
                          </Button>
                        )}
                        {routeUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PlaceIcon />}
                            onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}
                          >
                            Ver destino
                          </Button>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {String(venta.pedidoEstado || '').toLowerCase() === 'creando' && (
                          <Button startIcon={<AutorenewIcon />} variant="contained" onClick={handleIniciar}>
                            Iniciar entrega
                          </Button>
                        )}
                        {String(venta.pedidoEstado || '').toLowerCase() === 'en_camino' && (
                          <Button startIcon={<DoneAllIcon />} variant="contained" color="success" onClick={handleFinalizar}>
                            Finalizar entrega
                          </Button>
                        )}
                      </Stack>

                      <Box>
                        <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
                          Productos del pedido
                        </Typography>
                        <Stack spacing={1}>
                          {(venta.productosVendidos || []).map((item: any, index: number) => (
                            <Box
                              key={`${venta.id}-${item.producto?.id || index}`}
                              sx={{ p: 1.2, borderRadius: 2, border: '1px solid rgba(15,23,42,0.08)', bgcolor: '#fff' }}
                            >
                              <Typography variant="body2" fontWeight={700}>
                                {item.producto?.nombre || 'Producto'}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                <Chip size="small" icon={<Inventory2OutlinedIcon />} label={`${item.cantidad} unidad(es)`} variant="outlined" />
                                <Chip size="small" icon={<PaymentsOutlinedIcon />} label={formatCurrency(item.producto?.precioVenta)} variant="outlined" />
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      No tienes pedidos activos asignados. Aquí verás solo tus pedidos y acciones de reparto.
                    </Alert>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} lg={7}>
                <Paper sx={{ p: 2.25, borderRadius: 3, height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    <Typography variant="h6" fontWeight={900}>
                      Ubicación y ruta
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        icon={<MyLocationIcon />}
                        color={tracking ? 'success' : 'default'}
                        variant={tracking ? 'filled' : 'outlined'}
                        label={tracking ? 'Ubicación activa' : 'Ubicación detenida'}
                      />
                      <Chip
                        icon={<AccessTimeOutlinedIcon />}
                        variant="outlined"
                        label={
                          repartidor?.lastSeenAt
                            ? `Última señal ${new Date(repartidor.lastSeenAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                            : 'Sin señal registrada'
                        }
                      />
                    </Stack>
                  </Stack>

                  {(currentPoint || destino || path.length > 0) ? (
                    <LiveLeafletMap current={currentPoint} path={path} destination={destino} height={520} />
                  ) : (
                    <Alert severity="info">
                      Aún no hay ubicación suficiente para mostrar el mapa. Activa tu ubicación para que el admin y el cliente te sigan mejor.
                    </Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2.25, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
                Historial de delivery
              </Typography>

              {historial.length === 0 ? (
                <Alert severity="info">Todavía no hay entregas registradas para este repartidor.</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Pedido</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Dirección</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Contacto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historial.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={800}>
                              Pedido #{item.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatMetodoPago(item.metodoPago)}
                            </Typography>
                          </TableCell>
                          <TableCell>{new Date(item.fecha).toLocaleString('es-PE')}</TableCell>
                          <TableCell>{item.clienteNombre || 'Cliente sin nombre'}</TableCell>
                          <TableCell>{item.direccionEntrega || 'Sin dirección'}</TableCell>
                          <TableCell>
                            <Chip size="small" color={estadoChipColor(item.pedidoEstado)} label={formatPedidoEstado(item.pedidoEstado)} />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              {item.clienteTelefono && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<PhoneIcon />}
                                  onClick={() => window.open(`tel:${formatPhoneHref(item.clienteTelefono)}`, '_self')}
                                >
                                  Llamar
                                </Button>
                              )}
                              {item.clienteTelefono && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  startIcon={<WhatsAppIcon />}
                                  onClick={() => window.open(formatWhatsAppHref(item.clienteTelefono), '_blank', 'noopener,noreferrer')}
                                >
                                  WhatsApp
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            <Paper sx={{ p: 2.25, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 1.25 }}>
                Mi estado operativo
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
                {(['libre', 'ocupado', 'inactivo'] as const).map((estado) => (
                  <Button
                    key={estado}
                    variant={String(repartidor?.estado || '').toLowerCase() === estado ? 'contained' : 'outlined'}
                    color={estado === 'inactivo' ? 'inherit' : estado === 'ocupado' ? 'warning' : 'success'}
                    disabled={statusSaving}
                    onClick={() => void handleUpdateStatus(estado)}
                  >
                    {estado.toUpperCase()}
                  </Button>
                ))}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                Este estado también puede ser controlado por administración cuando te asignan o cierran un pedido.
              </Typography>
            </Paper>
          </>
        ) : null}
      </Stack>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2600}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Container>
  );
};

export default RepartidorPage;
