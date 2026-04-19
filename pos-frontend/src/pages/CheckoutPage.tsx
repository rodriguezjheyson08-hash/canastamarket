import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import ClienteHeader from '../components/layout/ClienteHeader';
import { useClienteAuth } from '../contexts/ClienteAuthContext';
import { useClienteCart } from '../contexts/ClienteCartContext';
import { createMercadoPagoPreference, createVenta } from '../services/api';
import { useI18n } from '../hooks/useI18n';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import axios from 'axios';
import { buildGoogleMapsSearchUrl } from '../utils/geo';
import { useTiendaConfig } from '../hooks/useTiendaConfig';
import { getDeliveryQuote } from '../utils/delivery';
import PaymentsIcon from '@mui/icons-material/Payments';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useNavigate } from 'react-router-dom';
import { getClienteToken } from '../utils/auth';

type PendingOrder = {
  clienteId: number;
  clienteNombre: string | null;
  items: Array<{ productoId: number; cantidad: number; title: string; unit_price: number }>;
  total: number;
  deliveryFee?: number;
  deliveryDistanceKm?: number;
  tipoEntrega?: 'delivery' | 'recojo';
  direccionEntrega?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  externalReference?: string | null;
};

const STORAGE_PENDING = 'mp_pending_cliente_order';
const placeholderImg = 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png';

const CheckoutPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { cliente } = useClienteAuth();
  const { items, setCantidad, removeItem, total, count, clear } = useClienteCart();
  const tiendaState = useTiendaConfig();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'recojo'>('delivery');
  const [payOpen, setPayOpen] = useState(false);
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [ubicacionLat, setUbicacionLat] = useState('');
  const [ubicacionLng, setUbicacionLng] = useState('');
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.origin.startsWith('https://');

  const subtotal = useMemo(() => Number(total || 0), [total]);

  useEffect(() => {
    if (!cliente) return;
    setDireccionEntrega(cliente.direccion || '');
    setUbicacionLat(cliente.ubicacionLat !== null && cliente.ubicacionLat !== undefined ? String(cliente.ubicacionLat) : '');
    setUbicacionLng(cliente.ubicacionLng !== null && cliente.ubicacionLng !== undefined ? String(cliente.ubicacionLng) : '');
  }, [cliente?.id]);

  const handleUseLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError(t('Tu navegador no soporta geolocalización.', 'Your browser does not support geolocation.'));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacionLat(String(pos.coords.latitude));
        setUbicacionLng(String(pos.coords.longitude));
        setGeoLoading(false);
      },
      () => {
        setError(t('No se pudo obtener tu ubicación. Revisa permisos.', 'Could not get location. Check permissions.'));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const hasCoords = useMemo(() => {
    const lat = Number(ubicacionLat);
    const lng = Number(ubicacionLng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }, [ubicacionLat, ubicacionLng]);

  const deliveryQuote = useMemo(() => {
    if (tipoEntrega !== 'delivery') return null;
    const tienda = tiendaState.config;
    if (!tienda) return null;
    return getDeliveryQuote({
      tienda: {
        tiendaLat: tienda.tiendaLat,
        tiendaLng: tienda.tiendaLng,
        deliveryEnabled: Boolean(tienda.deliveryEnabled)
      },
      cliente: {
        lat: hasCoords ? Number(ubicacionLat) : null,
        lng: hasCoords ? Number(ubicacionLng) : null
      },
      subtotal,
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
  }, [tipoEntrega, tiendaState.config, hasCoords, ubicacionLat, ubicacionLng, subtotal]);

  const deliveryFee = useMemo(() => (tipoEntrega === 'delivery' && deliveryQuote?.ok ? Number(deliveryQuote.fee || 0) : 0), [
    tipoEntrega,
    deliveryQuote?.ok,
    deliveryQuote?.fee
  ]);

  const grandTotal = useMemo(() => Number((subtotal + deliveryFee).toFixed(2)), [subtotal, deliveryFee]);
  const hasDireccionEntrega = useMemo(() => direccionEntrega.trim().length > 0, [direccionEntrega]);

  const canPay = useMemo(() => {
    if (items.length === 0) return false;
    if (grandTotal <= 0) return false;
    if (tipoEntrega === 'recojo') return true;
    return Boolean(deliveryQuote?.ok) && hasDireccionEntrega;
  }, [items.length, grandTotal, tipoEntrega, deliveryQuote?.ok, hasDireccionEntrega]);

  const iniciarPagoMercadoPago = async () => {
    if (!cliente) return;
    const clienteToken = getClienteToken();
    setError('');
    if (tipoEntrega === 'delivery' && !hasDireccionEntrega) {
      setError(t('Escribe la dirección de entrega antes de pagar.', 'Enter the delivery address before paying.'));
      return;
    }
    setLoading(true);
    try {
      const mpItems = items.map(i => ({
        title: i.producto.nombre,
        quantity: i.cantidad,
        unit_price: Number(i.producto.precioVenta || 0)
      }));
      if (tipoEntrega === 'delivery' && deliveryFee > 0) {
        mpItems.push({
          title: 'Delivery',
          quantity: 1,
          unit_price: Number(deliveryFee.toFixed(2))
        });
      }
      const origin = window.location.origin;
      const backBase = process.env.REACT_APP_MP_BACK_URL_BASE || origin;
      const backUrl = `${backBase}/checkout/resultado`;
      const notificationUrl = process.env.REACT_APP_MP_NOTIFICATION_URL;
      const canSendUrls = backBase.startsWith('https://');
      const externalReference = `pedido-${cliente.id}-${Date.now()}`;

      const preference = await createMercadoPagoPreference({
        items: mpItems,
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
        externalReference,
        metadata: {
          clienteId: cliente.id,
          clienteEmail: cliente.email
        }
      }, clienteToken);

      const initPoint = preference.init_point || preference.sandbox_init_point;
      if (!initPoint) {
        throw new Error(t('No se recibió el link de pago.', 'No payment link received.'));
      }

      const pending: PendingOrder = {
        clienteId: cliente.id,
        clienteNombre: cliente.nombreCompleto || null,
        tipoEntrega,
        deliveryFee: tipoEntrega === 'delivery' ? Number(deliveryFee.toFixed(2)) : 0,
        deliveryDistanceKm: tipoEntrega === 'delivery' && deliveryQuote?.ok ? Number(deliveryQuote.distanceKm || 0) : 0,
        direccionEntrega: tipoEntrega === 'delivery' ? (direccionEntrega.trim() || null) : null,
        ubicacionLat: tipoEntrega === 'delivery' ? (ubicacionLat.trim() === '' ? null : Number(ubicacionLat)) : null,
        ubicacionLng: tipoEntrega === 'delivery' ? (ubicacionLng.trim() === '' ? null : Number(ubicacionLng)) : null,
        externalReference,
        items: items.map(i => ({
          productoId: i.producto.id,
          cantidad: i.cantidad,
          title: i.producto.nombre,
          unit_price: Number(i.producto.precioVenta || 0)
        })),
        total: grandTotal
      };
      localStorage.setItem(STORAGE_PENDING, JSON.stringify(pending));
      // Navegar en la MISMA pestaña (sin abrir about:blank).
      window.location.href = initPoint;
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        const message = e.response?.data?.message || e.message || 'Error al generar pago con Mercado Pago';
        const details = e.response?.data?.details;
        const detailText = details ? ` (${JSON.stringify(details)})` : '';
        setError(`${message}${detailText}`);
        return;
      }
      const message = String(e?.message || '').trim();
      setError(message || t('Error al generar pago con Mercado Pago', 'Error generating Mercado Pago payment'));
    } finally {
      setLoading(false);
    }
  };

  const crearPedidoPagoAlRecibir = async () => {
    if (!cliente) return;
    const clienteToken = getClienteToken();
    setError('');
    if (tipoEntrega === 'delivery' && !hasDireccionEntrega) {
      setError(t('La dirección de entrega es obligatoria para delivery.', 'Delivery address is required for delivery.'));
      return;
    }
    setLoading(true);
    try {
      await createVenta({
        productosVendidos: items.map(i => ({
          productoId: i.producto.id,
          cantidad: i.cantidad,
          precioUnitario: Number(i.producto.precioVenta || 0)
        })),
        total: grandTotal,
        totalExtra: tipoEntrega === 'delivery' ? Number(deliveryFee.toFixed(2)) : 0,
        metodoPago: tipoEntrega === 'delivery' ? 'efectivo_contra_entrega' : 'efectivo_al_recojo',
        clienteNombre: cliente.nombreCompleto || null,
        clienteId: cliente.id,
        direccionEntrega: tipoEntrega === 'delivery' ? (direccionEntrega.trim() || null) : null,
        ubicacionLat: tipoEntrega === 'delivery' ? (ubicacionLat.trim() === '' ? null : Number(ubicacionLat)) : null,
        ubicacionLng: tipoEntrega === 'delivery' ? (ubicacionLng.trim() === '' ? null : Number(ubicacionLng)) : null
      }, clienteToken);
      setPayOpen(false);
      clear();
      navigate('/perfil', { replace: true });
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        const message = e.response?.data?.message || e.message || t('No se pudo registrar el pedido.', 'Could not create order.');
        setError(String(message));
      } else {
        setError(String(e?.message || t('No se pudo registrar el pedido.', 'Could not create order.')));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f4f7fb' }}>
      <ClienteHeader />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box mb={2} display="flex" alignItems="baseline" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Typography variant="h4" component="h1" fontWeight={900}>
            {t('Tu carrito', 'Your cart')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('Items:', 'Items:')} {count}
          </Typography>
        </Box>

        {items.length === 0 ? (
          <Alert severity="info">{t('Tu carrito está vacío.', 'Your cart is empty.')}</Alert>
        ) : (
          <Grid container spacing={2.5} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  {items.map((i) => (
                    <Box key={i.producto.id} display="flex" gap={1.5} alignItems="center">
                      <Box
                        component="img"
                        src={i.producto.imagen || placeholderImg}
                        alt={i.producto.nombre}
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 1,
                          objectFit: 'cover',
                          border: '1px solid rgba(0,0,0,0.08)'
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={900} noWrap>
                          {i.producto.nombre}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          S/ {Number(i.producto.precioVenta || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <TextField
                        label={t('Cantidad', 'Qty')}
                        type="number"
                        size="small"
                        value={i.cantidad}
                        inputProps={{ min: 1, style: { width: 96 } }}
                        onChange={(e) => setCantidad(i.producto.id, Number(e.target.value))}
                      />
                      <IconButton color="error" onClick={() => removeItem(i.producto.id)} aria-label="Quitar">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: { xs: 2, md: 2.5 }, position: 'sticky', top: 16 }}>
                <Typography variant="h6" fontWeight={900} gutterBottom>
                  {t('Resumen', 'Summary')}
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography color="text.secondary">{t('Subtotal', 'Subtotal')}</Typography>
                  <Typography fontWeight={900}>
                    S/ {Number(subtotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                {tipoEntrega === 'delivery' && (
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography color="text.secondary">{t('Delivery', 'Delivery')}</Typography>
                    <Typography fontWeight={900}>
                      {deliveryQuote?.ok
                        ? `S/ ${Number(deliveryFee || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography color="text.secondary">{t('Total a pagar', 'Total')}</Typography>
                  <Typography variant="h6" fontWeight={900}>
                    S/ {Number(grandTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mt: 1.5 }}>
                  {t(
                    'Puedes pagar ahora con Mercado Pago o pedir para pagar en efectivo al recibir / recoger.',
                    'You can pay now with Mercado Pago or place the order and pay cash on delivery / pickup.'
                  )}
                </Alert>

	                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={900} gutterBottom>
                  {t('Entrega', 'Delivery')}
                </Typography>

                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={tipoEntrega}
                  onChange={(_, v) => v && setTipoEntrega(v)}
                  sx={{ mb: 1.25 }}
                >
                  <ToggleButton value="delivery">{t('Delivery', 'Delivery')}</ToggleButton>
                  <ToggleButton value="recojo">{t('Recojo en tienda', 'Pick up')}</ToggleButton>
                </ToggleButtonGroup>

                {tipoEntrega === 'delivery' ? (
                  <>
                    <TextField
                      label={t('Dirección de entrega', 'Delivery address')}
                      value={direccionEntrega}
                      onChange={(e) => setDireccionEntrega(e.target.value)}
                      fullWidth
                      multiline
                      minRows={2}
                      placeholder={t('Ej: Trujillo, La Libertad, Calle 9 #123 (referencia: ...)', 'Example: City, neighborhood, street and reference')}
                      helperText={t('Escribe tu dirección completa (ciudad, distrito, calle, número y referencia).', 'Write your full address (city, area, street, number and reference).')}
                      sx={{ mb: 1.25 }}
                    />
                    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => window.open(buildGoogleMapsSearchUrl(direccionEntrega), '_blank', 'noopener,noreferrer')}
                        disabled={!direccionEntrega.trim()}
                      >
                        {t('Ver en Google Maps', 'View in Google Maps')}
                      </Button>
                      <Button variant="outlined" onClick={handleUseLocation} disabled={geoLoading}>
                        {geoLoading ? t('Obteniendo ubicación...', 'Getting location...') : t('Usar mi ubicación', 'Use my location')}
                      </Button>
                      {hasCoords && (
                        <Button
                          variant="text"
                          color="error"
                          onClick={() => {
                            setUbicacionLat('');
                            setUbicacionLng('');
                          }}
                        >
                          {t('Borrar ubicación', 'Clear location')}
                        </Button>
                      )}
                    </Box>
                    {hasCoords && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {t('Ubicación guardada para el delivery.', 'Location saved for delivery.')}
                      </Alert>
                    )}

                    {tiendaState.loading && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        {t('Calculando delivery...', 'Calculating delivery...')}
                      </Alert>
                    )}
                    {!hasDireccionEntrega && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('Falta escribir la dirección de entrega.', 'The delivery address is missing.')}
                      </Alert>
                    )}
                    {!tiendaState.loading && deliveryQuote && !deliveryQuote.ok && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        {deliveryQuote.message}
                      </Alert>
                    )}
                    {!tiendaState.loading && deliveryQuote?.ok && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        {t('Distancia aprox.:', 'Approx. distance:')} <b>{deliveryQuote.distanceKm} km</b> •{' '}
                        {t('Delivery:', 'Delivery:')}{' '}
                        <b>S/ {Number(deliveryFee || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('Recojo en tienda: no se cobra delivery.', 'Pick up: no delivery fee.')}
                  </Alert>
                )}

	                <Button
	                  sx={{ mt: 2 }}
	                  variant="contained"
	                  size="large"
	                  fullWidth
	                  startIcon={<ShoppingCartCheckoutIcon />}
	                  disabled={!canPay || loading}
	                  onClick={() => setPayOpen(true)}
	                >
	                  {t('Pagar', 'Pay')}
	                </Button>

                  <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle>{t('Métodos de pago', 'Payment methods')}</DialogTitle>
                    <DialogContent>
                      <Alert severity="info" sx={{ mb: 1.5 }}>
                        {t(
                          'No es necesario tener cuenta. Si Mercado Pago te pide iniciar sesión, busca la opción “Continuar como invitado” (si aparece).',
                          'No account is required. If Mercado Pago asks you to sign in, look for “Continue as guest” (if available).'
                        )}
                      </Alert>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PaymentsIcon />}
                        disabled={loading || !canPay}
                        onClick={() => {
                          setPayOpen(false);
                          iniciarPagoMercadoPago();
                        }}
                      >
                        Mercado Pago
                      </Button>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        {t(
                          'Tarjetas y otros métodos según disponibilidad de Mercado Pago.',
                          'Cards and other methods depending on Mercado Pago availability.'
                        )}
                      </Typography>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PointOfSaleIcon />}
                        disabled={loading || !canPay}
                        sx={{ mt: 2 }}
                        onClick={() => {
                          void crearPedidoPagoAlRecibir();
                        }}
                      >
                        {tipoEntrega === 'delivery'
                          ? t('Pedir y pagar al recibir', 'Order and pay on delivery')
                          : t('Pedir y pagar al recoger', 'Order and pay on pickup')}
                      </Button>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        {tipoEntrega === 'delivery'
                          ? t(
                              'Tu pedido se registra ahora y el pago queda pendiente hasta la entrega.',
                              'Your order is created now and payment stays pending until delivery.'
                            )
                          : t(
                              'Tu pedido se registra ahora y pagas en efectivo cuando lo recojas.',
                              'Your order is created now and you pay cash when you pick it up.'
                            )}
                      </Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setPayOpen(false)} disabled={loading}>
                        {t('Cancelar', 'Cancel')}
                      </Button>
                    </DialogActions>
                  </Dialog>

	                {!isHttpsOrigin && !process.env.REACT_APP_MP_BACK_URL_BASE && (
	                  <Alert severity="warning" sx={{ mt: 2 }}>
	                    {t(
	                      'En http://localhost Mercado Pago suele rechazar back_urls. Usa ngrok/https y ponlo en REACT_APP_MP_BACK_URL_BASE para que el pedido se registre automáticamente.',
	                      'You are on http://localhost. If Mercado Pago does not return payment_id, use ngrok/https to auto-finish the order.'
                    )}
                  </Alert>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default CheckoutPage;
