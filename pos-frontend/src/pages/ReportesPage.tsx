import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { 
  TrendingUp, 
  ShoppingCart, 
  AttachMoney, 
  Warning
} from '@mui/icons-material';
import { deleteVentas, deleteVentasByIds, getVentas } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Venta } from '../types';
import { loadVentasClienteMap } from '../utils/ventasClienteMap';

const ReportesPage: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [selectedVentaIds, setSelectedVentaIds] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVentasAll();
  }, []);

  useEffect(() => {
    const refrescar = () => {
      fetchVentasAll();
    };
    window.addEventListener('ventaRealizada', refrescar);
    window.addEventListener('ventaClienteUpdate', refrescar);
    return () => {
      window.removeEventListener('ventaRealizada', refrescar);
      window.removeEventListener('ventaClienteUpdate', refrescar);
    };
  }, []);

  const fetchVentasAll = async () => {
    try {
      const data = await getVentas();
      const clienteMap = loadVentasClienteMap();
      const ventasNormalizadas = (data || []).map((venta: any) => {
        const fallback = clienteMap[String(venta.id)] || {};
        const clienteNombre = String(
          venta.clienteNombre ?? venta.cliente_nombre ?? fallback.clienteNombre ?? ''
        ).trim();
        const clienteDni = String(
          venta.clienteDni ?? venta.cliente_dni ?? fallback.clienteDni ?? ''
        ).trim();

        return {
          ...venta,
          clienteNombre: clienteNombre || null,
          clienteDni: clienteDni || null
        } as Venta;
      });
      setVentas(ventasNormalizadas);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  const obtenerClienteVenta = (venta: Venta) => {
    const anyVenta = venta as any;
    const nombre = String(venta.clienteNombre ?? anyVenta?.cliente_nombre ?? '').trim();
    const dni = String(venta.clienteDni ?? anyVenta?.cliente_dni ?? '').trim();
    return {
      nombre: nombre || 'Público en general',
      dni: dni || ''
    };
  };

  const ventasPorDia = ventas.filter(v => {
    if (!fechaInicio) return true; // Si no hay filtro, mostrar todas
    const fechaVenta = new Date(v.fecha);
    return (
      fechaVenta.toLocaleDateString('es-PE') === fechaInicio.toLocaleDateString('es-PE')
    );
  });


  const formatCurrency = (value: number) => {
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Si es una fecha local ya formateada, la devolvemos tal como está
        return dateString;
      }
      return date.toLocaleString('es-PE');
    } catch (error) {
      // Si hay error al parsear, devolvemos la fecha original
      return dateString;
    }
  };

  const ventasFiltradas = ventas.filter(v => {
    const fechaVenta = new Date(v.fecha);
    if (fechaInicio && fechaVenta.toLocaleDateString('es-PE') < fechaInicio.toLocaleDateString('es-PE')) return false;
    return true;
  });

  useEffect(() => {
    const idsActuales = new Set((ventas || []).map((venta) => venta.id));
    setSelectedVentaIds((prev) => prev.filter((id) => idsActuales.has(id)));
  }, [ventas]);

  const clienteDetalleVenta = ventaDetalle ? obtenerClienteVenta(ventaDetalle) : { nombre: 'Público en general', dni: '' };

  const ventasPorDiaIds = ventasPorDia.map((venta) => venta.id);
  const seleccionadasEnVista = ventasPorDiaIds.filter((id) => selectedVentaIds.includes(id)).length;
  const todasSeleccionadasEnVista = ventasPorDiaIds.length > 0 && seleccionadasEnVista === ventasPorDiaIds.length;
  const seleccionParcialEnVista = seleccionadasEnVista > 0 && !todasSeleccionadasEnVista;

  const handleToggleVenta = (id: number, checked: boolean) => {
    setSelectedVentaIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleToggleTodasEnVista = (checked: boolean) => {
    setSelectedVentaIds((prev) => {
      if (checked) {
        const merged = [...prev];
        ventasPorDiaIds.forEach((id) => {
          if (!merged.includes(id)) {
            merged.push(id);
          }
        });
        return merged;
      }
      return prev.filter((id) => !ventasPorDiaIds.includes(id));
    });
  };

  const handleEliminarSeleccionadas = async () => {
    if (selectedVentaIds.length === 0) {
      return;
    }
    const confirm = window.confirm(`¿Eliminar ${selectedVentaIds.length} venta(s) seleccionada(s)?`);
    if (!confirm) return;
    try {
      await deleteVentasByIds(selectedVentaIds);
      setSelectedVentaIds([]);
      await fetchVentasAll();
      window.dispatchEvent(new Event('ventaRealizada'));
    } catch (error) {
      console.error('Error al eliminar ventas seleccionadas:', error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reportes y Estadísticas
      </Typography>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          color="warning"
          disabled={selectedVentaIds.length === 0}
          onClick={handleEliminarSeleccionadas}
          sx={{ mr: 1 }}
        >
          Eliminar seleccionadas ({selectedVentaIds.length})
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={async () => {
            if (!window.confirm('¿Estás seguro de que quieres eliminar todos los reportes? Esta acción no se puede deshacer.')) {
              return;
            }
            try {
              await deleteVentas();
              setSelectedVentaIds([]);
              await fetchVentasAll();
              window.dispatchEvent(new Event('ventaRealizada'));
            } catch (error) {
              console.error('Error al eliminar reportes:', error);
            }
          }}
        >
          Eliminar reportes
        </Button>
      </Box>

      {loading && <LoadingSpinner />}

      {/* Filtro de fecha arriba */}
      <Box mb={3}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Fecha de ventas"
            value={fechaInicio}
            onChange={setFechaInicio}
            format="dd/MM/yyyy"
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        {fechaInicio && (
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => setFechaInicio(null)}
            sx={{ ml: 2 }}
          >
            Mostrar todas las ventas
          </Button>
        )}
      </Box>

      {/* Estadísticas principales */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {ventas.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Productos Activos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ShoppingCart sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {ventasPorDia.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ventas Hoy
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AttachMoney sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {ventasPorDia.length > 0 ? formatCurrency(ventasPorDia.reduce((sum, v) => sum + v.total, 0)) : '$0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ingresos Hoy
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {ventas.length - ventasPorDia.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Productos Bajos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ventas del día seleccionado o de hoy */}
      <Typography variant="h5" gutterBottom>
        {fechaInicio ? `Ventas del ${fechaInicio.toLocaleDateString('es-PE')}` : 'Todas las ventas'}
      </Typography>
      {ventasPorDia.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay ventas registradas {fechaInicio ? 'en esta fecha' : 'en el sistema'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Las ventas realizadas {fechaInicio ? 'en esta fecha' : 'aparecerán aquí cuando se registren'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Total de ventas en localStorage: {ventas.length}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={todasSeleccionadasEnVista}
                    indeterminate={seleccionParcialEnVista}
                    onChange={(event) => handleToggleTodasEnVista(event.target.checked)}
                    inputProps={{ 'aria-label': 'Seleccionar todas las ventas visibles' }}
                  />
                </TableCell>
                <TableCell>ID Venta</TableCell>
                <TableCell>Hora</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Productos (detalle)</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventasPorDia.map((venta) => {
                const clienteVenta = obtenerClienteVenta(venta);
                return (
                  <TableRow key={venta.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedVentaIds.includes(venta.id)}
                        onChange={(event) => handleToggleVenta(venta.id, event.target.checked)}
                        inputProps={{ 'aria-label': `Seleccionar venta ${venta.id}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        #{venta.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(venta.fecha)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {clienteVenta.nombre}
                      </Typography>
                      {clienteVenta.dni && (
                        <Typography variant="caption" color="text.secondary">
                          DNI: {clienteVenta.dni}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-line', fontSize: 13, py: 1 }}>
                      {(venta.productosVendidos || []).map((vp, idx) => (
                        <span key={idx} style={{ display: 'block', marginBottom: 2 }}>
                          {vp.producto.nombre} x{vp.cantidad || 1} (S/ {vp.producto.precioVenta.toFixed(2)} c/u)
                        </span>
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        {formatCurrency(venta.total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button variant="outlined" size="small" onClick={() => setVentaDetalle(venta)}>
                        Ver detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Resumen del día */}
      {ventasPorDia.length > 0 && (
        <Box mt={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumen del Día
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total de ventas: <strong>{ventasPorDia.length}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Ingresos totales: <strong>{formatCurrency(ventasPorDia.reduce((sum, v) => sum + v.total, 0))}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Promedio por venta: <strong>{formatCurrency(ventasPorDia.reduce((sum, v) => sum + v.total, 0) / ventasPorDia.length)}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Productos vendidos: <strong>{ventasPorDia.reduce((sum, v) => sum + (v.productosVendidos || []).length, 0)}</strong>
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* RESUMEN DEL DÍA O RANGO */}
      <Box mt={4}>
        <Typography variant="h5" sx={{ mb: 2 }}>Resumen del periodo seleccionado</Typography>
        <Typography variant="body1">
          Total de productos vendidos: {(ventasFiltradas || []).reduce((sum, v) => sum + (v.productosVendidos || []).length, 0)}
        </Typography>
        <Typography variant="body1">
          Total de ingresos: S/ {(ventasFiltradas || []).reduce((sum, v) => sum + v.total, 0).toFixed(2)}
        </Typography>
      </Box>

      {/* Modal de detalle de venta */}
      <Dialog open={!!ventaDetalle} onClose={() => setVentaDetalle(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de Venta #{ventaDetalle?.id}</DialogTitle>
        <DialogContent dividers>
          {ventaDetalle && (
            <>
              <Box mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Cliente: <strong>{clienteDetalleVenta.nombre}</strong>
                </Typography>
                {clienteDetalleVenta.dni && (
                  <Typography variant="body2" color="text.secondary">
                    DNI: <strong>{clienteDetalleVenta.dni}</strong>
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Fecha y hora: {formatDate(ventaDetalle.fecha)}
              </Typography>
              <List>
                {(ventaDetalle.productosVendidos || []).map((vp, idx) => (
                  <ListItem key={idx} divider>
                    <ListItemText
                      primary={`${vp.producto.nombre} x${vp.cantidad || 1}`}
                      secondary={`S/ ${vp.producto.precioVenta.toFixed(2)} c/u`}
                    />
                    <Typography variant="body2" fontWeight="bold">
                      Subtotal: S/ {((vp.producto.precioVenta) * (vp.cantidad || 1)).toFixed(2)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
              <Box mt={2}>
                <Typography variant="h6" align="right">
                  Total: {formatCurrency(ventaDetalle.total)}
                </Typography>
              </Box>
              {/* Si existe método de pago */}
              {ventaDetalle && typeof (ventaDetalle as any).metodoPago !== 'undefined' && (ventaDetalle as any).metodoPago && (
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Método de pago: <strong>{(ventaDetalle as any).metodoPago}</strong>
                  </Typography>
                </Box>
              )}
              {ventaDetalle && typeof ventaDetalle.recibido !== 'undefined' && (
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Monto recibido: <strong>S/ {ventaDetalle.recibido?.toFixed(2)}</strong>
                  </Typography>
                </Box>
              )}
              {ventaDetalle && typeof ventaDetalle.vuelto !== 'undefined' && (
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Vuelto entregado: <strong>S/ {ventaDetalle.vuelto?.toFixed(2)}</strong>
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVentaDetalle(null)} color="primary">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReportesPage; 
