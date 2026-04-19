import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ClienteHeader from '../components/layout/ClienteHeader';
import { getMercadoPagoPayment, searchMercadoPagoPayment, createVenta } from '../services/api';
import { useClienteAuth } from '../contexts/ClienteAuthContext';
import { useClienteCart } from '../contexts/ClienteCartContext';
import { useI18n } from '../hooks/useI18n';
import { getClienteToken } from '../utils/auth';

type PendingOrder = {
  clienteId: number;
  clienteNombre: string | null;
  items: Array<{ productoId: number; cantidad: number }>;
  total: number;
  deliveryFee?: number;
  direccionEntrega?: string | null;
  ubicacionLat?: number | null;
  ubicacionLng?: number | null;
  externalReference?: string | null;
};

const STORAGE_PENDING = 'mp_pending_cliente_order';
const amountMatches = (expected: number, paid?: number) =>
  Number.isFinite(Number(paid)) && Math.abs(Number(paid) - Number(expected || 0)) <= 0.01;

const readPending = (): PendingOrder | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PENDING);
    if (!raw) return null;
    return JSON.parse(raw) as PendingOrder;
  } catch {
    return null;
  }
};

const CheckoutResultadoPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { cliente } = useClienteAuth();
  const { clear } = useClienteCart();

  const paymentId = useMemo(() => {
    return (
      params.get('payment_id') ||
      params.get('collection_id') ||
      params.get('paymentId') ||
      ''
    );
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const run = async () => {
      const clienteToken = getClienteToken();
      setLoading(true);
      setError('');
      setOk(false);

      const pending = readPending();
      if (!pending) {
        setError(t('No hay un pedido pendiente.', 'No pending order.'));
        setLoading(false);
        return;
      }

      if (!paymentId) {
        const ext = pending.externalReference ? String(pending.externalReference) : '';
        if (!ext) {
          setError(
            t(
              'No se recibió payment_id desde Mercado Pago. Vuelve al checkout e intenta de nuevo.',
              'No payment_id received. Go back to checkout and try again.'
            )
          );
          setLoading(false);
          return;
        }
        try {
          const search = await searchMercadoPagoPayment(ext, clienteToken);
          const found = search.payment;
          if (!found) {
            setError(
              t(
                'Aún no se encontró el pago. Si acabas de pagar, espera unos segundos y recarga esta página.',
                'Payment not found yet. If you just paid, wait a few seconds and refresh.'
              )
            );
            setLoading(false);
            return;
          }
          if (String(found.status || '').toLowerCase() !== 'approved') {
            setError(t(`Pago no aprobado (${found.status})`, `Payment not approved (${found.status})`));
            setLoading(false);
            return;
          }
          if (found.transaction_amount !== undefined && !amountMatches(pending.total, Number(found.transaction_amount))) {
            setError(
              t(
                'El monto pagado no coincide con el total del pedido. No se registró la orden.',
                'Paid amount does not match the order total. The order was not registered.'
              )
            );
            setLoading(false);
            return;
          }
        } catch (e: any) {
          setError(String(e?.message || t('No se pudo verificar el pago.', 'Could not verify payment.')));
          setLoading(false);
          return;
        }
      }

      try {
        if (paymentId) {
          const pago = await getMercadoPagoPayment(paymentId, clienteToken);
          if (String(pago.status || '').toLowerCase() !== 'approved') {
            throw new Error(t(`Pago no aprobado (${pago.status})`, `Payment not approved (${pago.status})`));
          }
          if (pago.transaction_amount !== undefined && !amountMatches(pending.total, Number(pago.transaction_amount))) {
            throw new Error(
              t(
                'El monto pagado no coincide con el total del pedido.',
                'Paid amount does not match the order total.'
              )
            );
          }
        }

        await createVenta({
          productosVendidos: pending.items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
          total: pending.total,
          totalExtra: Number(pending.deliveryFee || 0),
          metodoPago: 'mercadopago',
          recibido: pending.total,
          vuelto: 0,
          clienteNombre: pending.clienteNombre || cliente?.nombreCompleto || null,
          clienteId: pending.clienteId,
          direccionEntrega: pending.direccionEntrega ?? cliente?.direccion ?? null,
          ubicacionLat: pending.ubicacionLat ?? cliente?.ubicacionLat ?? null,
          ubicacionLng: pending.ubicacionLng ?? cliente?.ubicacionLng ?? null
        }, clienteToken);

        localStorage.removeItem(STORAGE_PENDING);
        clear();
        setOk(true);
      } catch (e: any) {
        const message = String(e?.message || '').trim();
        setError(message || t('No se pudo registrar el pedido.', 'Could not register order.'));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [paymentId, t, clear, cliente, retryKey]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <ClienteHeader />
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={900} gutterBottom>
            {t('Resultado del pago', 'Payment result')}
          </Typography>

          {loading && <Alert severity="info">{t('Procesando...', 'Processing...')}</Alert>}

          {!loading && ok && (
            <Alert
              severity="success"
              action={
                <Button color="inherit" size="small" onClick={() => navigate('/perfil', { replace: true })}>
                  {t('Ver perfil', 'View profile')}
                </Button>
              }
            >
              {t('Pedido registrado correctamente.', 'Order registered successfully.')}
            </Alert>
          )}

          {!loading && !ok && error && <Alert severity="error">{error}</Alert>}

          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            {!loading && !ok && (
              <Button variant="contained" onClick={() => setRetryKey((v) => v + 1)}>
                {t('Reintentar', 'Retry')}
              </Button>
            )}
            <Button variant="outlined" fullWidth onClick={() => navigate('/tienda')}>
              {t('Volver a tienda', 'Back to store')}
            </Button>
            <Button variant="contained" fullWidth onClick={() => navigate('/perfil')}>
              {t('Mi perfil', 'My profile')}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CheckoutResultadoPage;
