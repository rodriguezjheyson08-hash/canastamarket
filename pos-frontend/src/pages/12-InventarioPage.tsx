import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos]
  );

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
        <Tab label="Movimientos de stock" />
        <Tab label="Lotes" />
        <Tab label="Auditoria general" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField select fullWidth label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                {productosActivos.map((producto) => (
                  <MenuItem key={producto.id} value={producto.id}>
                    {producto.nombre} - Stock: {producto.stockActual}
                  </MenuItem>
                ))}
              </TextField>
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
            Esta tabla registra solo entradas y salidas de stock: ventas, pedidos online, compras recibidas, anulaciones y perdidas.
            Los cambios de productos, usuarios, caja o configuracion aparecen en Auditoria general.
          </Alert>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDateTime(mov.fecha)}</TableCell>
                    <TableCell>{mov.productoNombre}</TableCell>
                    <TableCell><Chip size="small" label={mov.tipo} /></TableCell>
                    <TableCell align="right">{mov.cantidad}</TableCell>
                    <TableCell align="right">{mov.stockAnterior} {'->'} {mov.stockNuevo}</TableCell>
                    <TableCell>{mov.referenciaTipo || '-'} {mov.referenciaId || ''}</TableCell>
                    <TableCell>{mov.usuarioNombre || '-'}</TableCell>
                  </TableRow>
                ))}
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
