import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  Paper
} from '@mui/material';
import { Refresh, Save } from '@mui/icons-material';
import {
  getAuditoriaLogs,
  getInventarioLotes,
  getInventarioMovimientos,
  getProductos,
  registrarPerdidaInventario
} from '../services/api';
import { AuditoriaLog, InventarioLote, InventarioMovimiento, Producto } from '../types';

const tiposPerdida = ['VENCIMIENTO', 'ROBO', 'ROTURA', 'MERMA', 'AJUSTE', 'OTRO'];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));

const formatMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `S/ ${amount.toFixed(2)}` : 'S/ 0.00';
};

type OperacionRow = {
  id: string;
  fecha: string;
  modulo: string;
  movimiento: string;
  detalle: string;
  referencia: string;
  usuario: string;
};

const detalleAuditoria = (log: AuditoriaLog) => {
  const detalle = log.detalle || {};
  switch (log.accion) {
    case 'CAJA_ABIERTA':
      return `Caja abierta con fondo base ${formatMoney(detalle.montoInicial)}.`;
    case 'CAJA_CERRADA':
      return `Caja cerrada. Esperado ${formatMoney(detalle.montoEsperado)}, contado ${formatMoney(detalle.montoFinalDeclarado)}, diferencia ${formatMoney(detalle.diferencia)}.`;
    case 'FONDO_CAJA_ASIGNADO':
      return `Fondo asignado ${formatMoney(detalle.monto)} a ${detalle.usuarioNombre || 'cajero'}.`;
    case 'CAJA_ENTRADA_EFECTIVO':
      return `Entrada de efectivo ${formatMoney(detalle.monto)}. Motivo: ${detalle.motivo || '-'}.`;
    case 'CAJA_SALIDA_EFECTIVO':
      return `Salida de efectivo ${formatMoney(detalle.monto)}. Motivo: ${detalle.motivo || '-'}.`;
    case 'VENTA_CREADA':
      return `Venta registrada por ${formatMoney(detalle.total)} con ${detalle.productos || 0} producto(s).`;
    case 'PERDIDA_REGISTRADA':
      return `Perdida ${detalle.tipo || ''} por ${detalle.cantidad || 0} unidad(es). Motivo: ${detalle.motivo || '-'}.`;
    default:
      if (!log.detalle) return 'Sin detalle';
      return Object.entries(detalle)
        .slice(0, 5)
        .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join(' | ');
  }
};

const InventarioPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [lotes, setLotes] = useState<InventarioLote[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaLog[]>([]);
  const [productoId, setProductoId] = useState('');
  const [tipo, setTipo] = useState('VENCIMIENTO');
  const [tipoPersonalizado, setTipoPersonalizado] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busquedaMovimiento, setBusquedaMovimiento] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos]
  );

  const productoSeleccionado = useMemo(
    () => productosActivos.find((producto) => String(producto.id) === productoId) || null,
    [productoId, productosActivos]
  );

  const operaciones = useMemo<OperacionRow[]>(() => {
    const stockRows = movimientos.map((mov) => ({
      id: `stock-${mov.id}`,
      fecha: mov.fecha,
      modulo: 'Stock',
      movimiento: mov.tipo,
      detalle: `${mov.productoNombre || 'Producto'} x${mov.cantidad} | Stock ${mov.stockAnterior} -> ${mov.stockNuevo}`,
      referencia: [mov.referenciaTipo, mov.referenciaId].filter(Boolean).join(' ') || '-',
      usuario: mov.usuarioNombre || 'Sistema'
    }));

    const auditoriaRows = auditoria.map((log) => ({
      id: `audit-${log.id}`,
      fecha: log.fecha,
      modulo: log.entidad || 'Sistema',
      movimiento: log.accion,
      detalle: detalleAuditoria(log),
      referencia: log.entidadId ? `${log.entidad} ${log.entidadId}` : '-',
      usuario: log.usuarioNombre || 'Sistema'
    }));

    return [...stockRows, ...auditoriaRows]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 300);
  }, [auditoria, movimientos]);

  const operacionesFiltradas = useMemo(() => {
    const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`).getTime() : null;
    const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59`).getTime() : null;
    const q = busquedaMovimiento.trim().toLowerCase();

    return operaciones.filter((op) => {
      const time = new Date(op.fecha).getTime();
      if (desde !== null && time < desde) return false;
      if (hasta !== null && time > hasta) return false;
      if (!q) return true;
      return [op.modulo, op.movimiento, op.detalle, op.referencia, op.usuario]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [busquedaMovimiento, fechaDesde, fechaHasta, operaciones]);

  const fetchData = async () => {
    const [productosData, movimientosData, lotesData, auditoriaData] = await Promise.all([
      getProductos(),
      getInventarioMovimientos(),
      getInventarioLotes(),
      getAuditoriaLogs()
    ]);
    setProductos(productosData);
    setMovimientos(movimientosData);
    setLotes(lotesData);
    setAuditoria(auditoriaData);
  };

  useEffect(() => {
    fetchData().catch((err) => setError(err?.response?.data?.message || 'No se pudo cargar inventario.'));
  }, []);

  const handleRegistrarPerdida = async () => {
    try {
      setError('');
      setMessage('');
      const id = Number(productoId);
      const qty = Number(cantidad);
      const tipoFinal = tipo === 'OTRO' ? tipoPersonalizado : tipo;
      if (!Number.isInteger(id) || id <= 0) {
        setError('Selecciona un producto valido.');
        return;
      }
      await registrarPerdidaInventario({ productoId: id, cantidad: qty, tipo: tipoFinal, motivo });
      setMessage('Perdida registrada y stock actualizado.');
      setMotivo('');
      setTipoPersonalizado('');
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo registrar la perdida.');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Operaciones</Typography>
          <Typography color="text.secondary">Perdidas, movimientos de stock, lotes y auditoria del sistema.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => fetchData()}>
          Actualizar
        </Button>
      </Box>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="Registrar perdida" />
        <Tab label="Movimientos generales" />
        <Tab label="Lotes" />
        <Tab label="Auditoria general" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Autocomplete
                fullWidth
                options={productosActivos}
                value={productoSeleccionado}
                onChange={(_, value) => setProductoId(value ? String(value.id) : '')}
                getOptionLabel={(producto) => `${producto.nombre} - Stock: ${producto.stockActual}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, state) => {
                  const q = state.inputValue.trim().toLowerCase();
                  if (!q) return options.slice(0, 50);
                  return options
                    .filter((producto) => [
                      producto.nombre,
                      producto.descripcion,
                      producto.codigoBarras,
                      String(producto.stockActual)
                    ].filter(Boolean).join(' ').toLowerCase().includes(q))
                    .slice(0, 50);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Producto"
                    placeholder="Buscar por nombre, descripcion o codigo"
                  />
                )}
                renderOption={(props, producto) => (
                  <Box component="li" {...props} key={producto.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{producto.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock: {producto.stockActual} {producto.codigoBarras ? `| Codigo: ${producto.codigoBarras}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select fullWidth label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {tiposPerdida.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </TextField>
            </Grid>
            {tipo === 'OTRO' && (
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Tipo personalizado"
                  value={tipoPersonalizado}
                  onChange={(e) => setTipoPersonalizado(e.target.value)}
                  placeholder="Ej. error de conteo"
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth label="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={tipo === 'OTRO' ? 12 : 3}>
              <Button fullWidth variant="contained" startIcon={<Save />} sx={{ height: '100%' }} onClick={handleRegistrarPerdida}>
                Registrar
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {tab === 1 && (
        <Stack spacing={1.5}>
          <Alert severity="info">
            Aqui se ve el historial operativo del sistema: ventas, stock, pedidos online, compras, perdidas, caja, usuarios,
            productos y configuracion. La perdida de producto baja stock, pero no descuenta dinero de caja.
          </Alert>
          <Paper sx={{ p: 1.5 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={3} md={2}>
                <TextField
                  label="Desde"
                  type="date"
                  size="small"
                  fullWidth
                  value={fechaDesde}
                  onChange={(event) => setFechaDesde(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3} md={2}>
                <TextField
                  label="Hasta"
                  type="date"
                  size="small"
                  fullWidth
                  value={fechaHasta}
                  onChange={(event) => setFechaHasta(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  label="Buscar movimiento, usuario o referencia"
                  size="small"
                  fullWidth
                  value={busquedaMovimiento}
                  onChange={(event) => setBusquedaMovimiento(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center" spacing={1}>
                  <Chip color="primary" variant="outlined" label={`${operacionesFiltradas.length} movimientos`} />
                  <Button size="small" onClick={() => { setFechaDesde(''); setFechaHasta(''); setBusquedaMovimiento(''); }}>
                    Limpiar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          <TableContainer component={Paper} sx={{ maxHeight: 620 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Operacion</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {operacionesFiltradas.map((op) => (
                  <TableRow key={op.id} hover>
                    <TableCell sx={{ minWidth: 135 }}>{formatDateTime(op.fecha)}</TableCell>
                    <TableCell><Chip size="small" label={op.modulo} sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 165 }}>{op.movimiento}</TableCell>
                    <TableCell sx={{ minWidth: 360 }}>{op.detalle}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>{op.referencia}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>{op.usuario}</TableCell>
                  </TableRow>
                ))}
                {operacionesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>No hay movimientos para esos filtros.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell align="right">Inicial</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell>Referencia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lotes.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell>{lote.productoNombre}</TableCell>
                  <TableCell>{lote.codigoLote || '-'}</TableCell>
                  <TableCell>{lote.fechaVencimiento || 'Sin fecha'}</TableCell>
                  <TableCell align="right">{lote.cantidadInicial}</TableCell>
                  <TableCell align="right">{lote.cantidadActual}</TableCell>
                  <TableCell align="right">{lote.costoUnitario !== null && lote.costoUnitario !== undefined ? `S/ ${lote.costoUnitario.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{lote.pedidoCompraId ? `PEDIDO_COMPRA ${lote.pedidoCompraId}` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 3 && (
        <Stack spacing={1}>
          <Alert severity="info">
            Auditoria general registra acciones del sistema: ventas, pedidos online, caja, productos, proveedores,
            usuarios, configuracion, compras recibidas y perdidas.
          </Alert>
          {auditoria.map((log) => (
            <Paper key={log.id} sx={{ p: 1.5 }}>
              <Typography fontWeight={700}>{log.accion} - {log.entidad} #{log.entidadId || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDateTime(log.fecha)} · {log.usuarioNombre || 'Sistema'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                {log.detalle ? JSON.stringify(log.detalle) : 'Sin detalle'}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default InventarioPage;
