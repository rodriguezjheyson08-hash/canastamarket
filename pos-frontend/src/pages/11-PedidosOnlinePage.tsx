/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/11-PedidosOnlinePage.tsx
 * QUE HACE: Modulo interno para recepcionar, revisar y cambiar estado de pedidos online.
 * GUIA: DISEÑO arma tabla y tarjetas; LOGICA consulta backend y actualiza estado.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
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
import { AssignmentTurnedIn, Payment, Refresh, ReceiptLong, Search } from '@mui/icons-material';
import { getPedidosOnline, updatePedidoOnlineEstado } from '../services/api';
import { PedidoOnline } from '../types';
import { PEDIDOS_ONLINE_UPDATE_EVENT } from '../components/layout/Header';

const estados: Array<'TODOS' | PedidoOnline['estado']> = [
  'TODOS',
  'PENDIENTE_RECOJO',
  'PENDIENTE_PAGO',
  'PAGADO',
  'RECOGIDO',
  'ANULADO'
];

const formatCurrency = (value: number | undefined | null) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));

const estadoColor = (estado: PedidoOnline['estado']) => {
  if (estado === 'RECOGIDO' || estado === 'PAGADO') return 'success';
  if (estado === 'ANULADO') return 'error';
  return 'warning';
};

const getMetodoCobroLabel = (metodo?: string) => {
  if (metodo === 'efectivo') return 'Efectivo';
  if (metodo === 'yape') return 'Yape';
  if (metodo === 'mercadopago_link') return 'Mercado Pago link';
  if (metodo === 'tarjeta') return 'Tarjeta';
  if (metodo === 'mixto_efectivo_yape') return 'Mixto: efectivo + Yape';
  return metodo || 'Al recoger';
};

const getPagoInfo = (pedido: PedidoOnline) => {
  const hasPagoReferencia = Boolean(String(pedido.pagoReferencia || '').trim());
  if (pedido.metodoPago === 'RECOJO' && pedido.estado === 'RECOGIDO') {
    const labelMetodo = getMetodoCobroLabel(pedido.pagoRecogidaMetodo);
    return {
      label: pedido.pagoRecogidaMetodo ? `Cobrado: ${labelMetodo}` : 'Cobrado al recoger',
      detail: pedido.pagoRecogidaMetodo
        ? `El cliente pago al recoger con ${labelMetodo}.`
        : 'El pedido fue entregado y cobrado al recoger.',
      color: 'success' as const
    };
  }
  if (pedido.metodoPago === 'RECOJO' && pedido.estado === 'ANULADO') {
    return {
      label: 'Pedido anulado',
      detail: 'No corresponde cobrar este pedido.',
      color: 'error' as const
    };
  }
  if (pedido.metodoPago === 'RECOJO') {
    return {
      label: 'Paga al recoger',
      detail: 'El cliente pagara cuando venga a tienda.',
      color: 'warning' as const
    };
  }
  if (pedido.estado === 'PENDIENTE_PAGO') {
    return {
      label: 'Pendiente de pago',
      detail: 'Selecciono Mercado Pago, pero aun no se confirma el pago.',
      color: 'warning' as const
    };
  }
  if (pedido.estado === 'ANULADO' && pedido.reembolsoEstado === 'NO_CAPTURADO') {
    return {
      label: 'Pago no capturado',
      detail: 'El pedido fue anulado sin confirmar cobro en Mercado Pago.',
      color: 'info' as const
    };
  }
  if (pedido.estado === 'ANULADO' && pedido.reembolsoEstado === 'PENDIENTE_MANUAL') {
    return {
      label: 'Reembolso manual pendiente',
      detail: 'Hubo pago online y queda pendiente revisar/devolver en Mercado Pago.',
      color: 'warning' as const
    };
  }
  if (pedido.metodoPago === 'MERCADO_PAGO' && !hasPagoReferencia) {
    return {
      label: 'Pago no confirmado',
      detail: 'Mercado Pago no confirmo automaticamente este cobro. No debe considerarse dinero recibido.',
      color: 'error' as const
    };
  }
  return {
    label: 'Pagado con Mercado Pago',
    detail: 'Pago online registrado mediante Mercado Pago.',
    color: 'success' as const
  };
};

const PedidosOnlinePage: React.FC = () => {
  // LOGICA PEDIDOS ONLINE - ESTADOS:
  // Guarda la lista, filtro, pedido seleccionado y mensajes del modulo.
  const [pedidos, setPedidos] = useState<PedidoOnline[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | PedidoOnline['estado']>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<PedidoOnline | null>(null);
  const [pedidoCobro, setPedidoCobro] = useState<PedidoOnline | null>(null);
  const [cobroMetodo, setCobroMetodo] = useState('efectivo');
  const [cobroRecibido, setCobroRecibido] = useState('');
  const [cobroMixtoEfectivo, setCobroMixtoEfectivo] = useState('');
  const [cobroMixtoYape, setCobroMixtoYape] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SERVICIO PEDIDOS ONLINE - LISTADO:
  // Carga pedidos desde MySQL; no depende del modulo Ventas.
  const fetchPedidos = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const data = await getPedidosOnline();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los pedidos online.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPedidos();
    const intervalId = window.setInterval(() => {
      void fetchPedidos(true);
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [fetchPedidos]);

  const pedidosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      const matchesEstado = estadoFiltro === 'TODOS' || pedido.estado === estadoFiltro;
      if (!matchesEstado) return false;
      if (!query) return true;

      const searchable = [
        pedido.codigo,
        pedido.estado,
        pedido.metodoPago,
        pedido.cliente.nombre,
        pedido.cliente.dni,
        pedido.cliente.email,
        pedido.cliente.telefono,
        ...pedido.productos.map((producto) => producto.nombre)
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [busqueda, estadoFiltro, pedidos]);

  const pendientes = useMemo(
    () => pedidos.filter((pedido) => ['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO'].includes(pedido.estado)).length,
    [pedidos]
  );

  // LOGICA PEDIDOS ONLINE - CAMBIO DE ESTADO:
  // Actualiza el estado y descuenta automaticamente del contador si pasa a RECOGIDO o ANULADO.
  const cambiarEstado = async (
    pedido: PedidoOnline,
    estado: PedidoOnline['estado'],
    pagoRecogida?: { metodo: string; recibido?: number | null; efectivo?: number | null; yape?: number | null }
  ) => {
    try {
      const actualizado = await updatePedidoOnlineEstado(pedido.id, estado, undefined, pagoRecogida);
      setPedidos((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
      setSelectedPedido((prev) => (prev?.id === actualizado.id ? actualizado : prev));
      setPedidoCobro((prev) => (prev?.id === actualizado.id ? null : prev));
      globalThis.dispatchEvent(new Event(PEDIDOS_ONLINE_UPDATE_EVENT));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado del pedido.');
    }
  };

  const iniciarRecogido = (pedido: PedidoOnline) => {
    if (pedido.metodoPago === 'RECOJO') {
      setPedidoCobro(pedido);
      setCobroMetodo('efectivo');
      setCobroRecibido(String(pedido.total));
      setCobroMixtoEfectivo('');
      setCobroMixtoYape(String(pedido.total));
      return;
    }
    void cambiarEstado(pedido, 'RECOGIDO');
  };

  const confirmarCobroRecogida = () => {
    if (!pedidoCobro) return;
    void cambiarEstado(pedidoCobro, 'RECOGIDO', {
      metodo: cobroMetodo,
      recibido: cobroMetodo === 'efectivo' ? Number(cobroRecibido) : pedidoCobro.total,
      efectivo: cobroMetodo === 'mixto_efectivo_yape' ? Number(cobroMixtoEfectivo || 0) : null,
      yape: cobroMetodo === 'mixto_efectivo_yape' ? Number(cobroMixtoYape || 0) : null
    });
  };

  const openBoleta = (pedido: PedidoOnline) => {
    if (!pedido.boletaHtml) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(pedido.boletaHtml);
    win.document.close();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* DISEÑO PEDIDOS ONLINE - CABECERA:
          Muestra titulo del modulo y contador operativo de pendientes. */}
      <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2} mb={3} flexDirection={{ xs: 'column', sm: 'row' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Pedidos online
          </Typography>
          <Typography color="text.secondary">
            Recepciona compras de clientes que pasan por tienda a recoger.
          </Typography>
        </Box>
        <Chip color="warning" label={`Pendientes: ${pendientes}`} sx={{ fontWeight: 800 }} />
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total pedidos</Typography>
              <Typography variant="h4" fontWeight={800}>{pedidos.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Pendientes</Typography>
              <Typography variant="h4" fontWeight={800}>{pendientes}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* DISEÑO PEDIDOS ONLINE - FILTROS:
          Permite buscar por letras y revisar todos o solo pedidos por estado. */}
      <Box display="flex" gap={1.5} mb={2} flexDirection={{ xs: 'column', sm: 'row' }}>
        <TextField
          label="Buscar pedido, DNI, cliente, correo o producto"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 360 } }}
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
          label="Estado"
          value={estadoFiltro}
          onChange={(event) => setEstadoFiltro(event.target.value as typeof estadoFiltro)}
          size="small"
          sx={{ minWidth: 220 }}
        >
          {estados.map((estado) => (
            <MenuItem key={estado} value={estado}>{estado}</MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => fetchPedidos()}>
          Actualizar
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* DISEÑO PEDIDOS ONLINE - TABLA:
          Lista cliente, contacto, total y acciones del pedido online. */}
      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Pedido</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contacto</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Pago</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Cargando pedidos online...</TableCell>
              </TableRow>
            ) : pedidosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No hay pedidos para mostrar.</TableCell>
              </TableRow>
            ) : (
              pedidosFiltrados.map((pedido) => (
                <TableRow key={pedido.id} hover>
                  <TableCell>{pedido.codigo}</TableCell>
                  <TableCell>{formatDateTime(pedido.fecha)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{pedido.cliente.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">DNI: {pedido.cliente.dni || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{pedido.cliente.email}</Typography>
                    <Typography variant="caption" color="text.secondary">{pedido.cliente.telefono}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={estadoColor(pedido.estado) as any} label={pedido.estado} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={getPagoInfo(pedido).color} label={getPagoInfo(pedido).label} />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(pedido.total)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button size="small" variant="outlined" onClick={() => setSelectedPedido(pedido)}>
                        Ver
                      </Button>
                      {!['RECOGIDO', 'ANULADO'].includes(pedido.estado) && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => iniciarRecogido(pedido)}
                          disabled={pedido.metodoPago === 'MERCADO_PAGO' && pedido.estado === 'PENDIENTE_PAGO'}
                        >
                          Recogido
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DISEÑO PEDIDOS ONLINE - DETALLE:
          Muestra datos completos de la persona y productos comprados. */}
      <Dialog open={Boolean(selectedPedido)} onClose={() => setSelectedPedido(null)} fullWidth maxWidth="md">
        <DialogTitle>Detalle del pedido online</DialogTitle>
        <DialogContent dividers>
          {selectedPedido && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{selectedPedido.codigo}</Typography>
                <Typography color="text.secondary">{formatDateTime(selectedPedido.fecha)}</Typography>
              </Box>
              <Alert severity="info">
                Cliente: {selectedPedido.cliente.nombre} · DNI: {selectedPedido.cliente.dni || '-'} · {selectedPedido.cliente.email} · {selectedPedido.cliente.telefono}
              </Alert>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Alert severity={getPagoInfo(selectedPedido).color} icon={<Payment />}>
                    <strong>Pago:</strong> {getPagoInfo(selectedPedido).label}. {getPagoInfo(selectedPedido).detail}
                    {selectedPedido.pagoRecogidaMetodo && (
                      <>
                        <br />
                        Cobrado al recoger: {getMetodoCobroLabel(selectedPedido.pagoRecogidaMetodo)}
                        {selectedPedido.pagoRecogidaRecibido != null ? ` - Recibido: ${formatCurrency(selectedPedido.pagoRecogidaRecibido)}` : ''}
                        {selectedPedido.pagoRecogidaVuelto ? ` - Vuelto: ${formatCurrency(selectedPedido.pagoRecogidaVuelto)}` : ''}
                        {selectedPedido.pagoRecogidaDetalle ? ` - Efectivo: ${formatCurrency(selectedPedido.pagoRecogidaDetalle.efectivo)} / Yape: ${formatCurrency(selectedPedido.pagoRecogidaDetalle.yape)}` : ''}
                      </>
                    )}
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Alert severity={selectedPedido.estado === 'RECOGIDO' ? 'success' : 'warning'}>
                    <strong>Recojo:</strong> {selectedPedido.estado === 'RECOGIDO'
                      ? 'Pedido ya fue recogido.'
                      : 'Pendiente para que el cliente pase por tienda.'}
                  </Alert>
                </Grid>
              </Grid>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="center">Cantidad</TableCell>
                    <TableCell align="right">P. Unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedPedido.productos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell align="center">{producto.cantidad}</TableCell>
                      <TableCell align="right">{formatCurrency(producto.precioVenta)}</TableCell>
                      <TableCell align="right">{formatCurrency(producto.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="h6" align="right">Total: {formatCurrency(selectedPedido.total)}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPedido?.boletaHtml && (
            <Button startIcon={<ReceiptLong />} onClick={() => openBoleta(selectedPedido)}>
              Ver boleta
            </Button>
          )}
          {selectedPedido && !['RECOGIDO', 'ANULADO'].includes(selectedPedido.estado) && (
            <Button
              startIcon={<AssignmentTurnedIn />}
              variant="contained"
              onClick={() => iniciarRecogido(selectedPedido)}
              disabled={selectedPedido.metodoPago === 'MERCADO_PAGO' && selectedPedido.estado === 'PENDIENTE_PAGO'}
            >
              Marcar recogido
            </Button>
          )}
          <Button onClick={() => setSelectedPedido(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(pedidoCobro)} onClose={() => setPedidoCobro(null)} fullWidth maxWidth="xs">
        <DialogTitle>Registrar pago al recoger</DialogTitle>
        <DialogContent dividers>
          {pedidoCobro && (
            <Stack spacing={2}>
              <Alert severity="warning">
                Este pedido fue elegido como paga al recoger. Registra como pago el cliente antes de marcarlo recogido.
              </Alert>
              <Typography fontWeight={700}>Total: {formatCurrency(pedidoCobro.total)}</Typography>
              <TextField select label="Metodo de pago" value={cobroMetodo} onChange={(event) => setCobroMetodo(event.target.value)} fullWidth>
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="yape">Yape</MenuItem>
                <MenuItem value="mercadopago_link">Mercado Pago link</MenuItem>
                <MenuItem value="tarjeta">Tarjeta</MenuItem>
                <MenuItem value="mixto_efectivo_yape">Mixto: efectivo + Yape</MenuItem>
              </TextField>
              {cobroMetodo === 'efectivo' && (
                <TextField
                  label="Monto recibido"
                  type="number"
                  value={cobroRecibido}
                  onChange={(event) => setCobroRecibido(event.target.value)}
                  fullWidth
                />
              )}
              {cobroMetodo === 'mixto_efectivo_yape' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Efectivo"
                    type="number"
                    value={cobroMixtoEfectivo}
                    onChange={(event) => setCobroMixtoEfectivo(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Yape"
                    type="number"
                    value={cobroMixtoYape}
                    onChange={(event) => setCobroMixtoYape(event.target.value)}
                    fullWidth
                  />
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPedidoCobro(null)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarCobroRecogida}>Confirmar cobro</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PedidosOnlinePage;
