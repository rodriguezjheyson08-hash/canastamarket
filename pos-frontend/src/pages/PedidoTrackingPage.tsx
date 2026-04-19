import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ClienteHeader from '../components/layout/ClienteHeader';
import { LiveLeafletMap } from '../components/maps/LiveLeafletMap';
import { getPedidoTracking, PedidoTrackingResponse } from '../services/reparto';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getClienteToken } from '../utils/auth';
import { useClienteAuth } from '../contexts/ClienteAuthContext';
import { getPedidosCliente } from '../services/clientes';
import DeliveryDiningOutlinedIcon from '@mui/icons-material/DeliveryDiningOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

type LatLng = { lat: number; lng: number };

const PedidoTrackingPage: React.FC = () => {
  const { ventaId } = useParams();
  const navigate = useNavigate();
  const { cliente } = useClienteAuth();

  const id = useMemo(() => {
    const n = Number(ventaId);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [ventaId]);

  const [data, setData] = useState<PedidoTrackingResponse | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendlyNumber, setFriendlyNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const run = async (silent = false) => {
      if (!silent) setLoading(true);
      setErr('');
      try {
        const res = await getPedidoTracking(id, getClienteToken());
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) {
          setData(null);
          setErr(String(e?.message || 'No se pudo cargar el seguimiento.'));
        }
      } finally {
        if (!silent && !cancelled) setLoading(false);
      }
    };
    void run(false);
    const interval = window.setInterval(() => void run(true), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (!id || !cliente?.id) return;
    let cancelled = false;
    const run = async () => {
      try {
        const pedidos = await getPedidosCliente(cliente.id);
        if (cancelled) return;
        const sorted = [...pedidos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        const index = sorted.findIndex((pedido) => pedido.id === id);
        setFriendlyNumber(index >= 0 ? index + 1 : null);
      } catch {
        if (!cancelled) setFriendlyNumber(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [cliente?.id, id]);

  const destino = useMemo<LatLng | null>(() => {
    const lat = Number(data?.venta?.ubicacionLat);
    const lng = Number(data?.venta?.ubicacionLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [data?.venta?.ubicacionLat, data?.venta?.ubicacionLng]);

  const origen = useMemo<LatLng | null>(() => {
    if (data?.last && Number.isFinite(Number(data.last.lat)) && Number.isFinite(Number(data.last.lng))) {
      return { lat: Number(data.last.lat), lng: Number(data.last.lng) };
    }
    const r = data?.repartidor;
    if (r && Number.isFinite(Number(r.lastLat)) && Number.isFinite(Number(r.lastLng))) {
      return { lat: Number(r.lastLat), lng: Number(r.lastLng) };
    }
    return null;
  }, [data?.last, data?.repartidor]);

  const path = useMemo<LatLng[]>(() => {
    const list: LatLng[] = [];
    (data?.history || []).forEach((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) list.push({ lat, lng });
    });
    if (data?.last) {
      const lat = Number(data.last.lat);
      const lng = Number(data.last.lng);
      const lastPoint = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      const tail = list[list.length - 1];
      if (lastPoint && (!tail || Math.abs(tail.lat - lastPoint.lat) > 1e-7 || Math.abs(tail.lng - lastPoint.lng) > 1e-7)) {
        list.push(lastPoint);
      }
    }
    return list;
  }, [data?.history, data?.last]);

  const openRouteUrl = useMemo(() => {
    if (!origen || !destino) return '';
    const o = encodeURIComponent(`${origen.lat},${origen.lng}`);
    const d = encodeURIComponent(`${destino.lat},${destino.lng}`);
    return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;
  }, [origen, destino]);

  const currentStepIndex = useMemo(() => {
    const estado = String(data?.venta?.pedidoEstado || '').trim().toLowerCase();
    if (estado === 'pendiente') return 0;
    if (estado === 'creando') return 1;
    if (estado === 'en_camino') return 2;
    if (estado === 'entregado') return 3;
    return -1;
  }, [data?.venta?.pedidoEstado]);

  const steps = ['Recibido', 'Preparando', 'En camino', 'Entregado'];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f4f7fb' }}>
      <ClienteHeader />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Paper sx={{ p: 2.5 }}>
          <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap" mb={1}>
            <Box>
              <Typography variant="h5" fontWeight={900}>
                {friendlyNumber ? `Pedido ${friendlyNumber}` : 'Seguimiento del pedido'}
              </Typography>
              {id && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Referencia interna #{id}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              {openRouteUrl && (
                <Button
                  variant="contained"
                  onClick={() => window.open(openRouteUrl, '_blank', 'noopener,noreferrer')}
                  endIcon={<OpenInNewIcon fontSize="small" />}
                >
                  Abrir ruta
                </Button>
              )}
              <Button variant="outlined" onClick={() => navigate('/perfil')}>
                Volver
              </Button>
            </Box>
          </Box>

          {!id && <Alert severity="error">ID de pedido inválido.</Alert>}
          {err && <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert>}
          {loading && !data && <Alert severity="info" sx={{ mt: 1 }}>Cargando…</Alert>}

          {data && (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                {steps.map((step, index) => (
                  <Chip
                    key={step}
                    icon={<DeliveryDiningOutlinedIcon />}
                    label={step}
                    color={currentStepIndex >= index ? 'primary' : 'default'}
                    variant={currentStepIndex >= index ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>

              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">
                      Estado
                    </Typography>
                    <Typography variant="h6" fontWeight={900}>
                      {data.venta?.pedidoEstado || '—'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">
                      Repartidor
                    </Typography>
                    <Typography variant="h6" fontWeight={900}>
                      {data.repartidor?.nombreCompleto || 'Asignando...'}
                    </Typography>
                    {data.repartidor?.motoMatricula && (
                      <Typography variant="body2" color="text.secondary">
                        Moto {data.repartidor.motoMatricula}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                    <Typography variant="caption" color="text.secondary">
                      Última señal
                    </Typography>
                    <Typography variant="h6" fontWeight={900}>
                      {data.last?.at ? new Date(data.last.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'Sin señal'}
                    </Typography>
                    <Chip size="small" icon={<AccessTimeOutlinedIcon />} label={data.last?.at ? 'Ubicación en vivo' : 'Esperando ubicación'} variant="outlined" sx={{ mt: 0.6 }} />
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <LiveLeafletMap current={origen} path={path} destination={destino} height={520} />
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default PedidoTrackingPage;
