/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/09-ReportesPage.tsx
 * QUE HACE: Muestra reportes de ventas, estadisticas y detalle de cada venta.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Assessment, AttachMoney, Inventory, PointOfSale, Warning } from '@mui/icons-material';
import {
  anularVenta,
  getCajas,
  getDashboardStats,
  getPedidosOnline,
  getVentas
} from '../services/api';
import { CajaSesion, DashboardStats, PedidoOnline, Venta, VentaProducto } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { formatBusinessDateTime, getBusinessDateValue } from '../utils/businessTime';

type ReportStatCardProps = {
  icon: React.ReactNode;
  value: string | number;
  label: string;
};

// DISEÑO REPORTES - TARJETAS SUPERIORES:
// Componente reutilizable para cada tarjeta con icono, numero grande y texto pequeño.
const ReportStatCard: React.FC<ReportStatCardProps> = ({ icon, value, label }) => (
  <Card sx={{ minHeight: 86, boxShadow: 1 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Box>
        <Typography variant="h4" component="div" sx={{ lineHeight: 1.05 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

// LOGICA REPORTES - FORMATO DE MONEDA:
// Convierte numeros del backend a formato soles, por ejemplo S/ 1,200.40.
const formatCurrency = (value: number | undefined | null) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// LOGICA REPORTES - FORMATO DE FECHA:
// Muestra la fecha y hora de cada venta dentro de la tabla y del modal de detalle.
const formatDateTime = formatBusinessDateTime;

// LOGICA REPORTES - FILTRO POR FECHA:
// Convierte la fecha de la venta a yyyy-mm-dd para compararla con el campo "Fecha de ventas".
const getSaleDateValue = getBusinessDateValue;

const esVentaDelDia = (venta: Venta) => getSaleDateValue(venta.fecha) === getSaleDateValue(new Date().toISOString());

const cajaDeVentaEstaAbierta = (venta: Venta, cajas: CajaSesion[]) => {
  if (!venta.cajaSesionId) return true;
  const caja = cajas.find((item) => Number(item.id) === Number(venta.cajaSesionId));
  return !caja || caja.estado === 'ABIERTA';
};

// LOGICA REPORTES - CLIENTE:
// Si la venta no tiene cliente registrado, muestra "Publico en general".
const getClienteLabel = (venta: Venta) => venta.clienteNombre || 'Publico en general';

// LOGICA REPORTES - DETALLE DE PRODUCTOS:
// Arma el texto que aparece en la columna "Productos (detalle)" de la tabla.
const getProductoDetalle = (item: VentaProducto) => {
  const producto = item.producto;
  const precio = producto?.precioVenta || 0;
  return `${producto?.nombre || 'Producto'} x${item.cantidad} (${formatCurrency(precio)} c/u)`;
};

const getMetodoPagoOnline = (pedido: PedidoOnline) => {
  if (pedido.estado === 'ANULADO' && pedido.reembolsoEstado === 'NO_CAPTURADO') return 'Mercado Pago no capturado';
  if (pedido.estado === 'ANULADO' && pedido.reembolsoEstado === 'PENDIENTE_MANUAL') return 'Mercado Pago: reembolso manual pendiente';
  if (pedido.metodoPago === 'MERCADO_PAGO' && !String(pedido.pagoReferencia || '').trim()) return 'Mercado Pago no confirmado';
  if (pedido.metodoPago === 'MERCADO_PAGO') return 'Mercado Pago online';
  if (pedido.pagoRecogidaMetodo === 'efectivo') return 'Efectivo al recoger';
  if (pedido.pagoRecogidaMetodo === 'yape') return 'Yape al recoger';
  if (pedido.pagoRecogidaMetodo === 'mercadopago_link') return 'Mercado Pago link al recoger';
  if (pedido.pagoRecogidaMetodo === 'tarjeta') return 'Tarjeta al recoger';
  if (pedido.pagoRecogidaMetodo === 'mixto_efectivo_yape') return 'Mixto: efectivo + Yape al recoger';
  return 'Pago al recoger';
};

const ReportesPage: React.FC = () => {
  // LOGICA REPORTES - ESTADOS:
  // Guarda estadisticas, ventas, filtro de fecha, venta seleccionada y estados de carga/error.
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pedidosOnline, setPedidosOnline] = useState<PedidoOnline[]>([]);
  const [cajas, setCajas] = useState<CajaSesion[]>([]);
  const [fechaVentas, setFechaVentas] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = String(user?.rol || '').toUpperCase() === 'ADMINISTRADOR';

  const puedeAnularVentaAdmin = (venta: Venta) =>
    isAdmin &&
    venta.id < 1000000 &&
    venta.estado !== 'ANULADA' &&
    esVentaDelDia(venta) &&
    cajaDeVentaEstaAbierta(venta, cajas);

  const handleAnularVenta = async (venta: Venta) => {
    if (!puedeAnularVentaAdmin(venta)) {
      setError('Solo se puede anular directamente una venta del dia y con caja abierta. Ventas pasadas requieren nota de credito o ajuste administrativo.');
      return;
    }
    const motivo = window.prompt(`Motivo de anulacion para venta #${venta.id}`);
    if (!motivo || !motivo.trim()) return;
    try {
      const updated = await anularVenta(venta.id, motivo.trim());
      setVentas((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedVenta(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo anular la venta.');
    }
  };

  // SERVICIO REPORTES - CARGA DE DATOS:
  // Trae en paralelo las estadisticas del dashboard y la lista de ventas desde el backend.
  useEffect(() => {
    const loadReportes = async () => {
      try {
        setLoading(true);
        setError('');
        const [statsData, ventasData, pedidosOnlineData, cajasData] = await Promise.all([
          getDashboardStats(), getVentas(), getPedidosOnline(), getCajas()
        ]);
        setStats(statsData);
        setVentas(Array.isArray(ventasData) ? ventasData : []);
        setPedidosOnline(Array.isArray(pedidosOnlineData) ? pedidosOnlineData : []);
        setCajas(Array.isArray(cajasData) ? cajasData : []);
      } catch (err: any) {
        setError(err?.response?.data?.message || t('No se pudieron cargar los reportes.', 'Could not load reports.'));
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      void loadReportes();
    } else {
      setLoading(false);
    }
  }, [isAdmin, t]);

  // LOGICA REPORTES - VENTAS ONLINE:
  // Convierte pedidos online completados a la misma forma de venta para que aparezcan en Reportes.
  // Solo se consideran pedidos RECOGIDO: ya fueron pagados/entregados y no siguen pendientes.
  const ventasConPedidosOnline = useMemo<Venta[]>(() => {
    const ventasOnline = pedidosOnline
      .filter((pedido) => pedido.estado === 'RECOGIDO')
      .map((pedido) => ({
        id: pedido.id + 1000000,
        numero: pedido.id,
        fecha: pedido.fecha,
        total: pedido.total,
        metodoPago: getMetodoPagoOnline(pedido),
        recibido: pedido.pagoRecogidaRecibido ?? pedido.total,
        vuelto: pedido.pagoRecogidaVuelto ?? 0,
        clienteDni: pedido.cliente.email,
        clienteNombre: `${pedido.cliente.nombre} (Online)`,
        vendedorId: null,
        vendedorUsuario: 'TIENDA_ONLINE',
        vendedorNombre: 'Tienda online',
        productosVendidos: pedido.productos.map((producto) => ({
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            descripcion: 'Pedido online',
            precioVenta: producto.precioVenta,
            stockActual: 0,
            categoriaId: 0
          },
          cantidad: producto.cantidad
        }))
      }));
    return [...ventas, ...ventasOnline].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [pedidosOnline, ventas]);

  // LOGICA REPORTES - VENTAS FILTRADAS:
  // Aplica el filtro de fecha antes de pintar las filas en la tabla.
  const ventasFiltradas = useMemo(
    () => ventasConPedidosOnline.filter((venta) => !fechaVentas || getSaleDateValue(venta.fecha) === fechaVentas),
    [fechaVentas, ventasConPedidosOnline]
  );

  // LOGICA REPORTES - RESUMEN DEL PERIODO:
  // Calcula los totales usando solo las ventas visibles despues del filtro de fecha.
  const resumenPeriodo = useMemo(() => {
    const ventasActivas = ventasFiltradas.filter((venta) => venta.estado !== 'ANULADA');
    const totalVentas = ventasActivas.length;
    const ingresosTotales = ventasActivas.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const productosVendidos = ventasActivas.reduce(
      (sum, venta) => sum + venta.productosVendidos.reduce((itemSum, item) => itemSum + Number(item.cantidad || 0), 0),
      0
    );
    const gananciaEstimada = ventasActivas.reduce((sum, venta) => (
      sum + venta.productosVendidos.reduce((itemSum, item) => {
        const precioVenta = Number(item.producto?.precioVenta || 0);
        const precioCompra = Number(item.producto?.precioCompra || 0);
        return itemSum + Math.max(0, precioVenta - precioCompra) * Number(item.cantidad || 0);
      }, 0)
    ), 0);
    const promedioPorVenta = totalVentas > 0 ? ingresosTotales / totalVentas : 0;

    return {
      totalVentas,
      ingresosTotales,
      productosVendidos,
      promedioPorVenta,
      gananciaEstimada
    };
  }, [ventasFiltradas]);

  // DISEÑO REPORTES - ACCESO DENEGADO:
  // Mensaje mostrado cuando el usuario no es administrador.
  if (!isAdmin) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">{t('Solo el administrador puede consultar reportes.', 'Only the administrator can view reports.')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* DISEÑO REPORTES - PARTE SUPERIOR:
          Titulo principal con icono de reportes. */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <Assessment color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" component="h1">
          {t('Reportes y Estadísticas', 'Reports and Statistics')}
        </Typography>
      </Box>

      {/* DISEÑO REPORTES - FILTRO DE FECHA:
          Campo para mostrar solo ventas de un dia especifico. */}
      <Box mb={3} maxWidth={220}>
        <TextField
          label={t('Fecha de ventas', 'Sales date')}
          type="date"
          value={fechaVentas}
          onChange={(event) => setFechaVentas(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
        />
      </Box>

      {/* DISEÑO REPORTES - MENSAJE DE ERROR:
          Aparece si falla la carga de estadisticas o ventas. */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* DISEÑO REPORTES - TARJETAS DE ESTADISTICAS:
          Bloque superior con productos activos, ventas hoy, ingresos y productos bajos. */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          {/* DISEÑO REPORTES - TARJETA PRODUCTOS ACTIVOS */}
          <ReportStatCard
            icon={<Inventory sx={{ fontSize: 34, color: '#1976d2' }} />}
            value={loading ? '-' : stats?.productosActivos ?? 0}
            label={t('Productos Activos', 'Active Products')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {/* DISEÑO REPORTES - TARJETA VENTAS HOY */}
          <ReportStatCard
            icon={<PointOfSale sx={{ fontSize: 34, color: '#2e7d32' }} />}
            value={loading ? '-' : stats?.ventasHoy ?? 0}
            label={t('Ventas Hoy', 'Sales Today')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {/* DISEÑO REPORTES - TARJETA INGRESOS HOY */}
          <ReportStatCard
            icon={<AttachMoney sx={{ fontSize: 34, color: '#ef6c00' }} />}
            value={loading ? '-' : formatCurrency(stats?.ingresosHoy)}
            label={t('Ingresos Hoy', 'Revenue Today')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          {/* DISEÑO REPORTES - TARJETA PRODUCTOS BAJOS */}
          <ReportStatCard
            icon={<Warning sx={{ fontSize: 34, color: '#d32f2f' }} />}
            value={loading ? '-' : stats?.productosBajos ?? 0}
            label={t('Productos Bajos', 'Low Stock Products')}
          />
        </Grid>
      </Grid>

      {/* DISEÑO REPORTES - TITULO DE TABLA:
          Encabezado visual antes del listado de ventas. */}
      <Typography variant="h5" component="h2" mb={1.5}>
        {t('Todas las ventas', 'All sales')}
      </Typography>

      {/* DISEÑO REPORTES - TABLA DE VENTAS:
          Contenedor principal de la tabla sin checks ni botones de eliminar. */}
      <TableContainer component={Card} sx={{ boxShadow: 1 }}>
        <Table size="small">
          {/* DISEÑO REPORTES - ENCABEZADOS DE TABLA:
              Columnas ID, hora, cliente, productos, total y acciones. */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('ID Venta', 'Sale ID')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Hora', 'Time')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Cliente', 'Customer')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Productos (detalle)', 'Products (detail)')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                {t('Total', 'Total')}
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                {t('Acciones', 'Actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          {/* DISEÑO REPORTES - CUERPO DE TABLA:
              Muestra estados de carga, vacio o filas de ventas. */}
          <TableBody>
            {loading ? (
              // DISEÑO REPORTES - FILA CARGANDO:
              // Texto mientras se esperan ventas desde el backend.
              <TableRow>
                <TableCell colSpan={6}>{t('Cargando ventas...', 'Loading sales...')}</TableCell>
              </TableRow>
            ) : ventasFiltradas.length === 0 ? (
              // DISEÑO REPORTES - FILA SIN RESULTADOS:
              // Texto cuando no hay ventas o el filtro de fecha no encuentra registros.
              <TableRow>
                <TableCell colSpan={6}>{t('No hay ventas para mostrar.', 'No sales to show.')}</TableCell>
              </TableRow>
            ) : (
              ventasFiltradas.map((venta) => (
                // DISEÑO REPORTES - FILA DE VENTA:
                // Muestra una venta y permite abrir su detalle.
                <TableRow key={venta.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>#{venta.id}</TableCell>
                  <TableCell>{formatDateTime(venta.fecha)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{getClienteLabel(venta)}</Typography>
                    {venta.clienteDni && (
                      <Typography variant="caption" color="text.secondary">
                        DNI: {venta.clienteDni}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {venta.productosVendidos.map((item, index) => (
                      <Typography key={`${venta.id}-${item.producto?.id || index}`} variant="caption" display="block">
                        {getProductoDetalle(item)}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {formatCurrency(venta.total)}
                    {venta.estado === 'ANULADA' && (
                      <Typography variant="caption" color="error" display="block">ANULADA</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {/* DISEÑO REPORTES - BOTON VER DETALLES:
                        Abre el modal con productos, subtotales y pago. */}
                    <Button variant="outlined" size="small" onClick={() => setSelectedVenta(venta)}>
                      {t('Ver detalles', 'View details')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DISEÑO REPORTES - RESUMEN FINAL:
          Bloque inferior que resume las ventas mostradas por el filtro actual. */}
      <Card sx={{ mt: 3, mb: 3, boxShadow: 1 }}>
        <CardContent>
          <Typography variant="h6" component="h2" mb={2} fontWeight={700}>
            {fechaVentas ? t('Resumen del Día', 'Day summary') : t('Resumen del periodo seleccionado', 'Selected period summary')}
          </Typography>

          {/* DISEÑO REPORTES - METRICAS DEL RESUMEN:
              Dos columnas con ventas, promedio, ingresos y productos vendidos. */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" mb={1.5}>
                Total de ventas: <strong>{resumenPeriodo.totalVentas}</strong>
              </Typography>
              <Typography variant="body2">
                Promedio por venta: <strong>{formatCurrency(resumenPeriodo.promedioPorVenta)}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" mb={1.5}>
                Ingresos totales: <strong>{formatCurrency(resumenPeriodo.ingresosTotales)}</strong>
              </Typography>
              <Typography variant="body2">
                Productos vendidos: <strong>{resumenPeriodo.productosVendidos}</strong>
              </Typography>
              <Typography variant="body2" mt={1.5}>
                Ganancia estimada: <strong>{formatCurrency(resumenPeriodo.gananciaEstimada)}</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* DISEÑO REPORTES - MODAL DETALLE DE VENTA:
          Ventana emergente que se abre al presionar "Ver detalles". */}
      <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }} fontWeight={700}>
        Aperturas y cierres de caja
      </Typography>
      <TableContainer component={Card} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Cajero</TableCell><TableCell>Apertura</TableCell>
            <TableCell align="right">Fondo admin</TableCell><TableCell align="right">Ventas total</TableCell>
            <TableCell align="right">Efectivo ventas</TableCell><TableCell align="right">Entradas</TableCell><TableCell align="right">Salidas</TableCell><TableCell align="right">Entregar admin</TableCell><TableCell align="right">Contado</TableCell>
            <TableCell align="right">Diferencia</TableCell><TableCell>Estado</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {cajas.length === 0 ? (
              <TableRow><TableCell colSpan={11}>Todavía no hay movimientos de caja.</TableCell></TableRow>
            ) : cajas.map((caja) => (
              <TableRow key={caja.id}>
                <TableCell>{caja.usuarioNombre}</TableCell><TableCell>{formatDateTime(caja.abiertaAt)}</TableCell>
                <TableCell align="right">{formatCurrency(caja.montoInicial)}</TableCell>
                <TableCell align="right">{formatCurrency(caja.totalVentas)}</TableCell>
                <TableCell align="right">{formatCurrency(caja.efectivoVentas ?? 0)}</TableCell>
                <TableCell align="right">{formatCurrency(caja.entradasEfectivo ?? 0)}</TableCell>
                <TableCell align="right">{formatCurrency(caja.salidasEfectivo ?? 0)}</TableCell>
                <TableCell align="right">{formatCurrency(caja.efectivoAEntregar ?? 0)}</TableCell>
                <TableCell align="right">{caja.montoFinalDeclarado == null ? '-' : formatCurrency(caja.montoFinalDeclarado)}</TableCell>
                <TableCell align="right" sx={{ color: caja.diferencia ? 'error.main' : 'success.main' }}>
                  {caja.diferencia == null ? '-' : formatCurrency(caja.diferencia)}
                </TableCell>
                <TableCell>{caja.estado}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(selectedVenta)} onClose={() => setSelectedVenta(null)} fullWidth maxWidth="sm">
        {selectedVenta && (
          <>
            {/* DISEÑO REPORTES - TITULO DEL MODAL */}
            <DialogTitle>{t('Detalle de Venta', 'Sale Detail')} #{selectedVenta.id}</DialogTitle>
            <DialogContent dividers>
              {/* DISEÑO REPORTES - DATOS GENERALES DEL MODAL:
                  Cliente y fecha/hora de la venta. */}
              <Typography variant="body2" color="text.secondary" mb={1}>
                Cliente: <strong>{getClienteLabel(selectedVenta)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Fecha y hora: {formatDateTime(selectedVenta.fecha)}
              </Typography>
              {selectedVenta.estado === 'ANULADA' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Venta anulada: {selectedVenta.anuladaMotivo || 'Sin motivo registrado'}
                </Alert>
              )}

              {/* DISEÑO REPORTES - PRODUCTOS DEL MODAL:
                  Lista cada producto con cantidad, precio unitario y subtotal. */}
              {selectedVenta.productosVendidos.map((item, index) => {
                const precio = item.producto?.precioVenta || 0;
                const subtotal = precio * item.cantidad;
                return (
                  <Box key={`${selectedVenta.id}-detalle-${item.producto?.id || index}`} display="flex" justifyContent="space-between" gap={2} mb={1.5}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        {item.producto?.nombre || 'Producto'} x{item.cantidad}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(precio)} c/u
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700}>
                      Subtotal: {formatCurrency(subtotal)}
                    </Typography>
                  </Box>
                );
              })}

              {/* DISEÑO REPORTES - TOTAL DEL MODAL:
                  Separador y total final de la venta. */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" align="right" mb={2}>
                Total: {formatCurrency(selectedVenta.total)}
              </Typography>

              {/* DISEÑO REPORTES - PAGO DEL MODAL:
                  Metodo de pago, monto recibido y vuelto entregado. */}
              <Typography variant="body2" color="text.secondary">
                Método de pago: <strong>{selectedVenta.metodoPago || 'efectivo'}</strong>
              </Typography>
              {selectedVenta.pagos && selectedVenta.pagos.map((pago) => (
                <Typography variant="body2" color="text.secondary" key={`${pago.metodo}-${pago.monto}`}>
                  {pago.metodo}: <strong>{formatCurrency(pago.monto)}</strong>
                  {pago.vuelto ? ` · Vuelto: ${formatCurrency(pago.vuelto)}` : ''}
                </Typography>
              ))}
              <Typography variant="body2" color="text.secondary">
                Monto recibido: <strong>{formatCurrency(selectedVenta.recibido ?? selectedVenta.total)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vuelto entregado: <strong>{formatCurrency(selectedVenta.vuelto ?? 0)}</strong>
              </Typography>
            </DialogContent>
            <DialogActions>
              {puedeAnularVentaAdmin(selectedVenta) && (
                <Button color="error" onClick={() => handleAnularVenta(selectedVenta)}>
                  Anular venta
                </Button>
              )}
              {/* DISEÑO REPORTES - BOTON CERRAR MODAL */}
              <Button onClick={() => setSelectedVenta(null)}>{t('Cerrar', 'Close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default ReportesPage;
