import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { AttachMoney, Person, PointOfSale } from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { deleteVentasByIds, getUsuarios, getVentas } from '../services/api';
import { Venta } from '../types';
import { loadVentasClienteMap } from '../utils/ventasClienteMap';
import { loadVentasVendedorMap } from '../utils/ventasVendedorMap';

const formatCurrency = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (isoDate: string) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate || '-';
  return parsed.toLocaleString('es-PE');
};

const sameDay = (isoDate: string, filterDate: Date) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toLocaleDateString('en-CA') === filterDate.toLocaleDateString('en-CA');
};

const getVendedorFromVenta = (
  venta: Venta,
  vendedorMap: Record<string, { vendedorId?: number | null; vendedorUsuario?: string | null; vendedorNombre?: string | null }> = {}
) => {
  const anyVenta = venta as any;
  const fallback = vendedorMap[String(venta.id)] || {};
  const vendedorUsuario = String(
    venta.vendedorUsuario ?? anyVenta?.vendedor_usuario ?? fallback.vendedorUsuario ?? ''
  ).trim();
  const vendedorNombre = String(
    venta.vendedorNombre ?? anyVenta?.vendedor_nombre ?? fallback.vendedorNombre ?? ''
  ).trim();
  const rawVendedorId = venta.vendedorId ?? anyVenta?.vendedor_id ?? fallback.vendedorId ?? null;
  const parsedVendedorId = Number(rawVendedorId);

  return {
    vendedorId: Number.isInteger(parsedVendedorId) && parsedVendedorId > 0 ? parsedVendedorId : null,
    vendedorUsuario: vendedorUsuario || 'sin_registro',
    vendedorNombre: vendedorNombre || vendedorUsuario || 'Sin registrar'
  };
};

const DetalleCajeroPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState<Date | null>(null);
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>('all');
  const [usuarios, setUsuarios] = useState<Array<{ usuario: string; nombre: string }>>([]);
  const [selectedVentaIds, setSelectedVentaIds] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ventasData, usuariosData] = await Promise.all([getVentas(), getUsuarios()]);
      const clienteMap = loadVentasClienteMap();
      const vendedorMap = loadVentasVendedorMap();
      const ventasNormalizadas = (ventasData || []).map((venta: any) => {
        const fallbackCliente = clienteMap[String(venta.id)] || {};
        const fallbackVendedor = vendedorMap[String(venta.id)] || {};
        const clienteNombre = String(
          venta.clienteNombre ?? venta.cliente_nombre ?? fallbackCliente.clienteNombre ?? ''
        ).trim();
        const clienteDni = String(
          venta.clienteDni ?? venta.cliente_dni ?? fallbackCliente.clienteDni ?? ''
        ).trim();
        const vendedorUsuario = String(
          venta.vendedorUsuario ?? venta.vendedor_usuario ?? fallbackVendedor.vendedorUsuario ?? ''
        ).trim();
        const vendedorNombre = String(
          venta.vendedorNombre ?? venta.vendedor_nombre ?? fallbackVendedor.vendedorNombre ?? ''
        ).trim();
        const vendedorIdRaw = venta.vendedorId ?? venta.vendedor_id ?? fallbackVendedor.vendedorId ?? null;
        const vendedorId = Number(vendedorIdRaw);

        return {
          ...venta,
          clienteNombre: clienteNombre || null,
          clienteDni: clienteDni || null,
          vendedorId: Number.isInteger(vendedorId) && vendedorId > 0 ? vendedorId : null,
          vendedorUsuario: vendedorUsuario || null,
          vendedorNombre: vendedorNombre || null
        } as Venta;
      });
      setVentas(ventasNormalizadas);

      const usuariosFromConfig = (usuariosData || []).map((u) => ({
          usuario: u.nombre_usuario,
          nombre: u.nombre_completo || u.nombre_usuario
      }));

      const usuariosFromVentas = ventasNormalizadas
        .map((venta) => getVendedorFromVenta(venta, vendedorMap))
        .filter((item) => item.vendedorUsuario !== 'sin_registro')
        .map((item) => ({
          usuario: item.vendedorUsuario,
          nombre: item.vendedorNombre
        }));

      const mergedByUser = [...usuariosFromConfig, ...usuariosFromVentas].reduce<Record<string, { usuario: string; nombre: string }>>(
        (acc, item) => {
          acc[item.usuario] = acc[item.usuario] || item;
          return acc;
        },
        {}
      );

      const usuariosMerged = Object.values(mergedByUser).sort((a, b) =>
        `${a.usuario} ${a.nombre}`.localeCompare(`${b.usuario} ${b.nombre}`, 'es', { sensitivity: 'base' })
      );
      setUsuarios(usuariosMerged);
    } catch (error) {
      console.error('Error al cargar detalle por cajero:', error);
      setVentas([]);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const refresh = () => {
      fetchData();
    };
    window.addEventListener('ventaRealizada', refresh);
    window.addEventListener('ventaClienteUpdate', refresh);
    window.addEventListener('ventaVendedorUpdate', refresh);
    return () => {
      window.removeEventListener('ventaRealizada', refresh);
      window.removeEventListener('ventaClienteUpdate', refresh);
      window.removeEventListener('ventaVendedorUpdate', refresh);
    };
  }, []);

  const ventasFiltradas = useMemo(() => {
    return (ventas || []).filter((venta) => {
      const vendedor = getVendedorFromVenta(venta);
      const byUsuario = usuarioFiltro === 'all' || vendedor.vendedorUsuario === usuarioFiltro;
      const byFecha = !fechaFiltro || sameDay(venta.fecha, fechaFiltro);
      return byUsuario && byFecha;
    });
  }, [ventas, usuarioFiltro, fechaFiltro]);

  const ventasFiltradasIds = useMemo(() => ventasFiltradas.map((venta) => venta.id), [ventasFiltradas]);

  useEffect(() => {
    setSelectedVentaIds((prev) => prev.filter((id) => ventasFiltradasIds.includes(id)));
  }, [ventasFiltradasIds]);

  const seleccionadasEnVista = ventasFiltradasIds.filter((id) => selectedVentaIds.includes(id)).length;
  const todasSeleccionadasEnVista = ventasFiltradasIds.length > 0 && seleccionadasEnVista === ventasFiltradasIds.length;
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
        ventasFiltradasIds.forEach((id) => {
          if (!merged.includes(id)) {
            merged.push(id);
          }
        });
        return merged;
      }
      return prev.filter((id) => !ventasFiltradasIds.includes(id));
    });
  };

  const handleEliminarSeleccionadas = async () => {
    if (selectedVentaIds.length === 0) return;
    const confirmed = window.confirm(`¿Eliminar ${selectedVentaIds.length} venta(s) seleccionada(s)?`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteVentasByIds(selectedVentaIds);
      setSelectedVentaIds([]);
      await fetchData();
      window.dispatchEvent(new Event('ventaRealizada'));
    } catch (error) {
      console.error('Error al eliminar ventas seleccionadas:', error);
    } finally {
      setDeleting(false);
    }
  };

  const totalVentas = ventasFiltradas.length;
  const totalMonto = ventasFiltradas.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
  const promedioVenta = totalVentas > 0 ? totalMonto / totalVentas : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Detalle Cajero
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <TextField
          select
          label="Usuario"
          value={usuarioFiltro}
          onChange={(e) => setUsuarioFiltro(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="all">Todos los usuarios</MenuItem>
          {usuarios.map((usuario) => (
            <MenuItem key={usuario.usuario} value={usuario.usuario}>
              {usuario.usuario} - {usuario.nombre}
            </MenuItem>
          ))}
        </TextField>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Fecha de venta"
            value={fechaFiltro}
            onChange={setFechaFiltro}
            format="dd/MM/yyyy"
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
      </Box>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          color="error"
          disabled={selectedVentaIds.length === 0 || deleting}
          onClick={handleEliminarSeleccionadas}
        >
          {deleting ? 'Eliminando...' : `Eliminar seleccionadas (${selectedVentaIds.length})`}
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5}>
                <PointOfSale color="primary" />
                <Box>
                  <Typography variant="h5">{totalVentas}</Typography>
                  <Typography variant="body2" color="text.secondary">Ventas filtradas</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5}>
                <AttachMoney color="success" />
                <Box>
                  <Typography variant="h5">{formatCurrency(totalMonto)}</Typography>
                  <Typography variant="body2" color="text.secondary">Monto total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Person color="secondary" />
                <Box>
                  <Typography variant="h5">{formatCurrency(promedioVenta)}</Typography>
                  <Typography variant="body2" color="text.secondary">Promedio por venta</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={todasSeleccionadasEnVista}
                  indeterminate={seleccionParcialEnVista}
                  onChange={(e) => handleToggleTodasEnVista(e.target.checked)}
                  inputProps={{ 'aria-label': 'Seleccionar todas las ventas visibles' }}
                />
              </TableCell>
              <TableCell>ID Venta</TableCell>
              <TableCell>Fecha y Hora</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Productos</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ventasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No hay ventas para los filtros seleccionados.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              ventasFiltradas.map((venta) => {
                const vendedor = getVendedorFromVenta(venta);
                const cliente = String(venta.clienteNombre || '').trim() || 'Público en general';
                return (
                  <TableRow key={venta.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedVentaIds.includes(venta.id)}
                        onChange={(e) => handleToggleVenta(venta.id, e.target.checked)}
                        inputProps={{ 'aria-label': `Seleccionar venta ${venta.id}` }}
                      />
                    </TableCell>
                    <TableCell>#{venta.id}</TableCell>
                    <TableCell>{formatDateTime(venta.fecha)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{vendedor.vendedorNombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{vendedor.vendedorUsuario}</Typography>
                    </TableCell>
                    <TableCell>{cliente}</TableCell>
                    <TableCell>{venta.metodoPago || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-line', fontSize: 13, py: 1 }}>
                      {(venta.productosVendidos || []).map((vp, idx) => (
                        <span key={idx} style={{ display: 'block', marginBottom: 2 }}>
                          {vp.producto.nombre} x{vp.cantidad || 1}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        {formatCurrency(venta.total)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default DetalleCajeroPage;
