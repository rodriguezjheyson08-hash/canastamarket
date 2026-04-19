import React, { useState, useEffect } from 'react';
import {
  Badge,
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Alert,
  Snackbar,
  Avatar,
  TextField,
  CircularProgress,
  Divider
} from '@mui/material';
import { Add, Edit, Delete, AddShoppingCart, RemoveCircleOutline, LocalShipping, Search, WarningAmber } from '@mui/icons-material';
import { Producto, Categoria, Proveedor } from '../types';
import ProductoForm from '../components/forms/ProductoForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  createProducto,
  deleteProducto,
  getCategorias,
  getPersonaPorDni,
  getProductos,
  updateProducto
} from '../services/api';
import { useI18n } from '../hooks/useI18n';
import { createPedidoCompra, getProveedores } from '../services/proveedores';
import { loadBoletaConfig } from '../utils/boletaConfig';
import { generatePedidoCompraPdf } from '../utils/pedidoCompraPdf';
import { useAuth } from '../contexts/AuthContext';

// Imágenes de ejemplo para bebidas
const imagenesBebidas: Record<string, string> = {
  'Ron Barceló': 'https://www.licoresmedellin.com/cdn/shop/products/ron-barcelo-anejo-700ml.jpg?v=1677692782',
  'Cerveza Corona': 'https://www.latiendadelcervecero.com/cdn/shop/products/Corona355ml.png?v=1614359782',
  'Tequila Don Julio': 'https://cdn.shopify.com/s/files/1/0257/6089/3921/products/tequila-don-julio-reposado-750ml.png?v=1642521072',
  'Whisky Johnnie Walker': 'https://www.licoresmedellin.com/cdn/shop/products/whisky-johnnie-walker-red-label-700ml.jpg?v=1677692782',
  'Vodka Smirnoff': 'https://www.latiendadelcervecero.com/cdn/shop/products/Smirnoff700ml.png?v=1614359782',
};

const MESA_SERVICE_CATEGORY = 'servicios';
const MESA_SERVICE_DESCRIPTION = 'servicio de mesa de billar';
const LOW_STOCK_THRESHOLD = 10;

const ProductosPage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | undefined>();
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number>(0);
  const [busqueda, setBusqueda] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);

  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [pedidoProveedorId, setPedidoProveedorId] = useState<number | ''>('');
  const [pedidoNotas, setPedidoNotas] = useState('');
  const [pedidoItems, setPedidoItems] = useState<Record<number, { producto: Producto; cantidad: number }>>({});
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresLoading, setProveedoresLoading] = useState(false);
  const [pedidoCreating, setPedidoCreating] = useState(false);
  const [pedidoError, setPedidoError] = useState('');

  const [solicitanteDni, setSolicitanteDni] = useState('');
  const [solicitanteNombre, setSolicitanteNombre] = useState('');
  const [solicitanteLoading, setSolicitanteLoading] = useState(false);
  const [solicitanteError, setSolicitanteError] = useState('');

  const pedidoTotalCantidad = Object.values(pedidoItems).reduce((sum, it) => sum + Number(it?.cantidad || 0), 0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProductos(), fetchCategorias()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      setProductos([]);
      showSnackbar(t('Error al cargar productos', 'Error loading products'), 'error');
    }
  };

  const fetchCategorias = async () => {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      setCategorias([]);
      showSnackbar(t('Error al cargar categorías', 'Error loading categories'), 'error');
    }
  };

  const handleCreate = () => {
    setEditingProducto(undefined);
    setFormOpen(true);
  };

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('¿Estás seguro de que quieres eliminar este producto?', 'Are you sure you want to delete this product?'))) return;
    try {
      await deleteProducto(id);
      setProductos(prev => prev.filter(p => p.id !== id));
      showSnackbar(t('Producto eliminado exitosamente', 'Product deleted successfully'), 'success');
    } catch (error) {
      showSnackbar(t('Error al eliminar producto', 'Error deleting product'), 'error');
    }
  };

  const handleSubmit = async (productoData: Omit<Producto, 'id'>) => {
    setSaving(true);
    let imagenFinal = productoData.imagen;
    if (!imagenFinal || imagenFinal.trim() === '') {
      imagenFinal = imagenesBebidas[productoData.nombre] || 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png';
    }
    const productoDataConImagen = { ...productoData, imagen: imagenFinal };
    try {
      if (editingProducto) {
        const actualizado = await updateProducto(editingProducto.id, productoDataConImagen);
        setProductos(prev => prev.map(p => (p.id === editingProducto.id ? actualizado : p)));
        showSnackbar(t('Producto actualizado exitosamente', 'Product updated successfully'), 'success');
      } else {
        const creado = await createProducto(productoDataConImagen);
        setProductos(prev => [...prev, creado]);
        showSnackbar(t('Producto creado exitosamente', 'Product created successfully'), 'success');
      }
      setFormOpen(false);
    } catch (error) {
      showSnackbar(t('Error al guardar producto', 'Error saving product'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const ensureProveedoresLoaded = async () => {
    if (proveedoresLoading) return;
    if (proveedores.length > 0) return;
    setProveedoresLoading(true);
    try {
      const data = await getProveedores();
      setProveedores(Array.isArray(data) ? data : []);
    } catch {
      setProveedores([]);
      showSnackbar(t('Error al cargar proveedores', 'Error loading suppliers'), 'error');
    } finally {
      setProveedoresLoading(false);
    }
  };

  const handleOpenPedido = async () => {
    setPedidoError('');
    setSolicitanteError('');
    setSolicitanteDni('');
    setSolicitanteNombre('');
    setPedidoOpen(true);
    await ensureProveedoresLoaded();
  };

  const handleBuscarSolicitante = async () => {
    const dni = String(solicitanteDni || '').replace(/\D/g, '').slice(0, 8);
    setSolicitanteDni(dni);
    setSolicitanteNombre('');
    setSolicitanteError('');

    if (!/^\d{8}$/.test(dni)) {
      setSolicitanteError(t('El DNI debe tener 8 dígitos', 'DNI must be 8 digits'));
      return;
    }

    setSolicitanteLoading(true);
    try {
      const data = await getPersonaPorDni(dni);
      const nombreCompleto = String(data?.nombreCompleto || '').trim() || [data?.nombres, data?.apellidos].filter(Boolean).join(' ').trim();
      if (nombreCompleto) setSolicitanteNombre(nombreCompleto);
      else setSolicitanteError(t('No se encontraron datos para ese DNI', 'No data found for that DNI'));
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '').trim();
      setSolicitanteError(message || t('No se pudo consultar DNI', 'Could not fetch DNI'));
    } finally {
      setSolicitanteLoading(false);
    }
  };

  const handleAddToPedido = (producto: Producto) => {
    setPedidoItems((prev) => {
      const current = prev[producto.id];
      const nextCantidad = (current?.cantidad || 0) + 1;
      return { ...prev, [producto.id]: { producto, cantidad: nextCantidad } };
    });
    showSnackbar(t('Producto agregado al pedido', 'Product added to order'), 'success');
  };

  const handleRemoveFromPedido = (productoId: number) => {
    setPedidoItems((prev) => {
      const next = { ...prev };
      delete next[productoId];
      return next;
    });
  };

  const handleUpdatePedidoCantidad = (productoId: number, cantidad: number) => {
    setPedidoItems((prev) => {
      const item = prev[productoId];
      if (!item) return prev;
      return { ...prev, [productoId]: { ...item, cantidad } };
    });
  };

  const handleAddLowStockToPedido = () => {
    const productosBajoStock = productosVisibles.filter((p) => Number(p.stockActual) < LOW_STOCK_THRESHOLD);
    if (productosBajoStock.length === 0) {
      showSnackbar(t('No hay productos con stock bajo', 'No low stock products'), 'error');
      return;
    }

    setPedidoItems((prev) => {
      const next = { ...prev };
      for (const producto of productosBajoStock) {
        if (next[producto.id]) continue;
        const stockActual = Number(producto.stockActual) || 0;
        const sugerida = Math.max(1, LOW_STOCK_THRESHOLD - stockActual);
        next[producto.id] = { producto, cantidad: sugerida };
      }
      return next;
    });

    showSnackbar(
      t(
        `Se agregaron productos de stock bajo al pedido (mín. ${LOW_STOCK_THRESHOLD}).`,
        `Low stock products added to the order (min. ${LOW_STOCK_THRESHOLD}).`
      ),
      'success'
    );
  };

  const handleCreatePedidoAndDownload = async () => {
    setPedidoError('');
    if (!pedidoProveedorId) {
      setPedidoError(t('Selecciona un proveedor', 'Select a supplier'));
      return;
    }
    const items = Object.values(pedidoItems)
      .map((it) => ({ productoId: it.producto.id, cantidad: Number(it.cantidad) }))
      .filter((it) => Number.isFinite(it.productoId) && it.productoId > 0 && Number.isFinite(it.cantidad) && it.cantidad > 0);

    if (items.length === 0) {
      setPedidoError(t('Agrega al menos un producto', 'Add at least one product'));
      return;
    }

    setPedidoCreating(true);
    try {
      const pedido = await createPedidoCompra({
        proveedorId: Number(pedidoProveedorId),
        items,
        notas: pedidoNotas.trim() || undefined
      });

      await generatePedidoCompraPdf(pedido, loadBoletaConfig(), user, {
        dni: solicitanteDni,
        nombreCompleto: solicitanteNombre
      });

      setPedidoItems({});
      setPedidoProveedorId('');
      setPedidoNotas('');
      setPedidoOpen(false);
      showSnackbar(t('Orden de compra generada (PDF)', 'Purchase order generated (PDF)'), 'success');
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '').trim();
      setPedidoError(message || t('No se pudo generar la orden', 'Could not create the order'));
    } finally {
      setPedidoCreating(false);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) return 'S/ 0.00';
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  const categoriaNombreById = categorias.reduce<Record<number, string>>((acc, categoria) => {
    acc[categoria.id] = (categoria.nombre || '').trim().toLowerCase();
    return acc;
  }, {});

  const esProductoServicioMesa = (producto: Producto) => {
    const categoriaNombre = categoriaNombreById[producto.categoriaId] || '';
    const nombre = (producto.nombre || '').trim().toLowerCase();
    const descripcion = (producto.descripcion || '').trim().toLowerCase();
    return (
      categoriaNombre === MESA_SERVICE_CATEGORY ||
      descripcion === MESA_SERVICE_DESCRIPTION ||
      /^mesa\s*\d+\s*\(billar\)$/i.test(nombre)
    );
  };

  const categoriasVisibles = categorias.filter(
    (categoria) => (categoria.nombre || '').trim().toLowerCase() !== MESA_SERVICE_CATEGORY
  );

  const productosVisibles = productos.filter((producto) => !esProductoServicioMesa(producto));

  const productosFiltrados = productosVisibles.filter(p => {
    const descripcion = (p.descripcion || '').toLowerCase();
    const nombre = (p.nombre || '').toLowerCase();
    const term = busqueda.toLowerCase();
    return (
      (categoriaSeleccionada === 0 || p.categoriaId === categoriaSeleccionada) &&
      (!soloBajoStock || Number(p.stockActual) < LOW_STOCK_THRESHOLD) &&
      (nombre.includes(term) || descripcion.includes(term))
    );
  });

  const countBajoStock = productosVisibles.filter((p) => Number(p.stockActual) < LOW_STOCK_THRESHOLD).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {t('Gestión de Productos', 'Product Management')}
        </Typography>
        <Box display="flex" gap={2}>
          <Badge color="primary" badgeContent={pedidoTotalCantidad} invisible={pedidoTotalCantidad === 0}>
            <Button
              variant="outlined"
              startIcon={<LocalShipping />}
              onClick={handleOpenPedido}
            >
              {t('Pedido a proveedor', 'Supplier order')}
            </Button>
          </Badge>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreate}
          >
            {t('Nuevo Producto', 'New Product')}
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 2
        }}
      >
        <Paper variant="outlined" sx={{ px: 1, flex: 1, minWidth: 0 }}>
          <Tabs
            value={categoriaSeleccionada}
            onChange={(_, value) => setCategoriaSeleccionada(Number(value))}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="categorias"
          >
            <Tab value={0} label={t('Todas', 'All')} />
            {categoriasVisibles.map((cat) => (
              <Tab key={cat.id} value={cat.id} label={cat.nombre} />
            ))}
          </Tabs>
        </Paper>

        <Badge color="error" badgeContent={countBajoStock} invisible={countBajoStock === 0}>
          <Button
            variant={soloBajoStock ? 'contained' : 'outlined'}
            color="error"
            startIcon={<WarningAmber />}
            onClick={() => setSoloBajoStock((v) => !v)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {t(`Stock bajo (<${LOW_STOCK_THRESHOLD})`, `Low stock (<${LOW_STOCK_THRESHOLD})`)}
          </Button>
        </Badge>

        <TextField
          label={t('Buscar producto', 'Search product')}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          variant="outlined"
          sx={{ minWidth: { xs: '100%', md: 280 } }}
        />
      </Box>

      {productosFiltrados.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('No hay productos que coincidan con la búsqueda o filtro', 'No products match the search or filter')}
          </Typography>
        </Paper>
      ) : (
        categoriasVisibles
          .filter(cat => categoriaSeleccionada === 0 || cat.id === categoriaSeleccionada)
          .map(cat => {
            const productosDeCategoria = productosFiltrados.filter(p => p.categoriaId === cat.id);
            if (productosDeCategoria.length === 0) return null;
            return (
              <Box key={cat.id} mb={4}>
                <Typography variant="h5" sx={{ mb: 2, mt: 2 }}>
                  {cat.nombre}
                </Typography>
                <Box sx={{ mb: 2, ml: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('Total de productos:', 'Total products:')} {productosDeCategoria.length} | {t('Stock total:', 'Total stock:')} {productosDeCategoria.reduce((sum, p) => sum + p.stockActual, 0)}
                  </Typography>
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('Imagen', 'Image')}</TableCell>
                        <TableCell>{t('Nombre', 'Name')}</TableCell>
                        <TableCell align="left">{t('Descripción', 'Description')}</TableCell>
                        <TableCell align="right">{t('Precio', 'Price')}</TableCell>
                        <TableCell align="right">{t('Stock', 'Stock')}</TableCell>
                        <TableCell align="center">{t('Acciones', 'Actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productosDeCategoria.map((producto) => (
                        <TableRow key={producto.id}>
                          <TableCell>
                            <Avatar
                              variant="rounded"
                              src={producto.imagen || imagenesBebidas[producto.nombre] || 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png'}
                              alt={producto.nombre}
                              sx={{ width: 40, height: 60, bgcolor: '#f5f5f5' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ textDecoration: producto.stockActual === 0 ? 'line-through' : 'none', color: producto.stockActual === 0 ? 'gray' : 'inherit' }}>
                              {producto.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell align="left">
                            <Typography variant="body2" color="text.secondary">
                              {producto.descripcion}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight="bold">
                              {formatCurrency(Number(producto.precioVenta))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={producto.stockActual}
                              color={producto.stockActual < 10 ? 'error' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleAddToPedido(producto)}
                              color="success"
                              aria-label="add-to-order"
                            >
                              <AddShoppingCart />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(producto)}
                              color="primary"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(producto.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })
      )}

      <Dialog open={pedidoOpen} onClose={() => setPedidoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('Pedido a proveedor', 'Supplier order')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="pedido-proveedor-label">{t('Proveedor', 'Supplier')}</InputLabel>
              <Select
                labelId="pedido-proveedor-label"
                label={t('Proveedor', 'Supplier')}
                value={pedidoProveedorId}
                onChange={(e) => setPedidoProveedorId(e.target.value as any)}
                disabled={proveedoresLoading || pedidoCreating}
              >
                {proveedores.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.razonSocial} ({p.numeroDocumento})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label={t('Notas (opcional)', 'Notes (optional)')}
              value={pedidoNotas}
              onChange={(e) => setPedidoNotas(e.target.value)}
              fullWidth
              disabled={pedidoCreating}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              {t('Datos del solicitante', 'Requester data')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label={t('DNI del solicitante', 'Requester DNI')}
                value={solicitanteDni}
                onChange={(e) => {
                  const next = String(e.target.value || '').replace(/\D/g, '').slice(0, 8);
                  setSolicitanteDni(next);
                  setSolicitanteNombre('');
                  setSolicitanteError('');
                }}
                fullWidth
                disabled={pedidoCreating}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
                error={Boolean(solicitanteError)}
                helperText={solicitanteError || t('8 dígitos', '8 digits')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleBuscarSolicitante}
                        disabled={pedidoCreating || solicitanteLoading || !/^\d{8}$/.test(String(solicitanteDni || ''))}
                        edge="end"
                        aria-label="buscar-dni"
                      >
                        {solicitanteLoading ? <CircularProgress size={18} /> : <Search />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                label={t('Nombre completo', 'Full name')}
                value={solicitanteNombre}
                onChange={(e) => setSolicitanteNombre(e.target.value)}
                fullWidth
                disabled={pedidoCreating}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {t('Productos del pedido', 'Order items')}
            </Typography>

            <Badge color="error" badgeContent={countBajoStock} invisible={countBajoStock === 0}>
              <Button
                variant="outlined"
                startIcon={<AddShoppingCart />}
                onClick={handleAddLowStockToPedido}
                disabled={pedidoCreating || productosVisibles.length === 0 || countBajoStock === 0}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {t(`Agregar stock bajo (<${LOW_STOCK_THRESHOLD})`, `Add low stock (<${LOW_STOCK_THRESHOLD})`)}
              </Button>
            </Badge>
          </Box>

          {Object.keys(pedidoItems).length === 0 ? (
            <Alert severity="info">
              {t(
                'Usa el carrito (+) en la lista de productos para agregar productos al pedido.',
                'Use the cart (+) in the product list to add items to the order.'
              )}
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('Producto', 'Product')}</TableCell>
                    <TableCell align="right">{t('Cantidad', 'Quantity')}</TableCell>
                    <TableCell align="center">{t('Quitar', 'Remove')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(pedidoItems)
                    .sort((a, b) => (a.producto.nombre || '').localeCompare(b.producto.nombre || ''))
                    .map((it) => (
                      <TableRow key={it.producto.id}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {it.producto.nombre}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            value={it.cantidad}
                            onChange={(e) => handleUpdatePedidoCantidad(it.producto.id, Math.max(1, Number(e.target.value || 1)))}
                            type="number"
                            size="small"
                            inputProps={{ min: 1 }}
                            disabled={pedidoCreating}
                            sx={{ width: 110 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveFromPedido(it.producto.id)}
                            disabled={pedidoCreating}
                          >
                            <RemoveCircleOutline />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {pedidoError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {pedidoError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPedidoOpen(false)} disabled={pedidoCreating}>
            {t('Cerrar', 'Close')}
          </Button>
	          <Button
	            variant="contained"
	            onClick={handleCreatePedidoAndDownload}
	            disabled={pedidoCreating || !pedidoProveedorId || Object.keys(pedidoItems).length === 0}
	          >
	            {pedidoCreating ? t('Generando...', 'Generating...') : t('Generar y descargar PDF', 'Generate & download PDF')}
	          </Button>
	        </DialogActions>
	      </Dialog>

      <ProductoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        producto={editingProducto}
        loading={saving}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProductosPage; 
