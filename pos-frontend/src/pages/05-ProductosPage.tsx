/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/05-ProductosPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { Add, Edit, Delete, Search, AssignmentTurnedIn, ShoppingCart, RemoveCircleOutline, PersonSearch, Warning } from '@mui/icons-material';
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
import { createPedidoCompra, downloadPedidoCompraPdf, getProveedores } from '../services/proveedores';
import { useI18n } from '../hooks/useI18n';
import { filtrarProductosParaGestion } from '../utils/productFilters';
import {
  buildPedidoProductos,
  getCantidadSugeridaPedido,
  getTotalPedidoCantidad,
  isProductoBajoStock,
  normalizePedidoCantidad
} from '../utils/productStock';
import { loadBoletaConfig } from '../utils/boletaConfig';

// Imágenes de ejemplo para bebidas
const imagenesBebidas: Record<string, string> = {
  'Ron Barceló': 'https://www.licoresmedellin.com/cdn/shop/products/ron-barcelo-anejo-700ml.jpg?v=1677692782',
  'Cerveza Corona': 'https://www.latiendadelcervecero.com/cdn/shop/products/Corona355ml.png?v=1614359782',
  'Tequila Don Julio': 'https://cdn.shopify.com/s/files/1/0257/6089/3921/products/tequila-don-julio-reposado-750ml.png?v=1642521072',
  'Whisky Johnnie Walker': 'https://www.licoresmedellin.com/cdn/shop/products/whisky-johnnie-walker-red-label-700ml.jpg?v=1677692782',
  'Vodka Smirnoff': 'https://www.latiendadelcervecero.com/cdn/shop/products/Smirnoff700ml.png?v=1614359782',
};

const ProductosPage: React.FC = () => {
  const { t } = useI18n();
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
  // LOGICA PEDIDO: controla si se muestra u oculta la ventana "Pedido a proveedor".
  const [pedidoOpen, setPedidoOpen] = useState(false);
  // LOGICA PEDIDO: lista de proveedores que llena el selector del modal.
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  // LOGICA PEDIDO: proveedor elegido para generar la orden de compra.
  const [proveedorId, setProveedorId] = useState(0);
  // LOGICA PEDIDO: bloquea el boton mientras se crea el pedido y descarga el PDF.
  const [pedidoLoading, setPedidoLoading] = useState(false);
  // LOGICA PEDIDO: carrito temporal. La clave es productoId y el valor es cantidad solicitada.
  const [pedidoItems, setPedidoItems] = useState<Record<number, number>>({});
  // LOGICA PEDIDO: notas opcionales que se envian al backend y aparecen en el pedido.
  const [pedidoNotas, setPedidoNotas] = useState('');
  // LOGICA PEDIDO: DNI del trabajador/persona que solicita el pedido.
  const [solicitanteDni, setSolicitanteDni] = useState('');
  // LOGICA PEDIDO: nombre del solicitante, se puede escribir o rellenar desde la busqueda DNI.
  const [solicitanteNombre, setSolicitanteNombre] = useState('');
  // LOGICA PEDIDO: indica si se esta consultando el DNI del solicitante.
  const [dniLoading, setDniLoading] = useState(false);
  const [soloBajoStock, setSoloBajoStock] = useState(false);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      return String(error.response?.data?.message || fallback);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      setProductos([]);
      showSnackbar(t('Error al cargar productos', 'Error loading products'), 'error');
    }
  }, [showSnackbar, t]);

  const fetchCategorias = useCallback(async () => {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (error) {
      setCategorias([]);
      showSnackbar(t('Error al cargar categorías', 'Error loading categories'), 'error');
    }
  }, [showSnackbar, t]);

  const fetchProveedores = useCallback(async () => {
    try {
      // SERVICIO PEDIDO: trae proveedores activos para llenar el combo "Proveedor".
      const data = await getProveedores();
      setProveedores(data);
      if (data.length > 0) {
        setProveedorId((prev) => prev || data[0].id);
      }
    } catch (error) {
      setProveedores([]);
      showSnackbar(t('Error al cargar proveedores', 'Error loading suppliers'), 'error');
    }
  }, [showSnackbar, t]);

  useEffect(() => {
// LOGICA: load Data concentra una operacion de este archivo.
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProductos(), fetchCategorias()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCategorias, fetchProductos]);

// LOGICA: handle Create concentra una operacion de este archivo.
  const handleCreate = () => {
    setEditingProducto(undefined);
    setFormOpen(true);
  };

// LOGICA: handle Edit concentra una operacion de este archivo.
  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setFormOpen(true);
  };

// LOGICA: handle Delete concentra una operacion de este archivo.
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

// LOGICA: handle Submit concentra una operacion de este archivo.
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
      showSnackbar(getErrorMessage(error, t('Error al guardar producto', 'Error saving product')), 'error');
    } finally {
      setSaving(false);
    }
  };

// LOGICA: format Currency concentra una operacion de este archivo.
  const formatCurrency = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) return 'S/ 0.00';
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  const categoriaNombrePorId = useMemo(() => categorias.reduce<Record<number, string>>((acc, cat) => {
    acc[cat.id] = cat.nombre;
    return acc;
  }, {}), [categorias]);

  const productosBajoStock = useMemo(
    () => productos.filter(isProductoBajoStock),
    [productos]
  );

  // LOGICA PEDIDO - CARRITO:
  // Convierte el mapa de cantidades en una lista ordenada para mostrar y enviar al backend.
  const pedidoProductos = useMemo(
    () => buildPedidoProductos(pedidoItems, productos),
    [pedidoItems, productos]
  );

  const totalPedidoCantidad = useMemo(
    () => getTotalPedidoCantidad(pedidoProductos),
    [pedidoProductos]
  );

  const productosFiltrados = useMemo(() => {
    // Prueba unitaria: src/utils/productFilters.test.ts valida busqueda por texto,
    // codigo de barras y filtro por categoria usados en esta seccion de Productos.
    const filtradosBase = filtrarProductosParaGestion(productos, busqueda, categoriaSeleccionada, categoriaNombrePorId);
    return soloBajoStock ? filtradosBase.filter(isProductoBajoStock) : filtradosBase;
  }, [busqueda, categoriaNombrePorId, categoriaSeleccionada, productos, soloBajoStock]);

// LOGICA PEDIDO - APERTURA:
// Abre el modal para crear una orden de compra al proveedor.
  const handleOpenPedido = async () => {
    setPedidoOpen(true);
    if (proveedores.length === 0) {
      await fetchProveedores();
    }
  };

// LOGICA PEDIDO - AGREGAR PRODUCTO:
// Agrega un producto individual al carrito de la orden de compra.
  const handleAddToPedido = async (producto: Producto, cantidad?: number) => {
    const cantidadFinal = cantidad ?? getCantidadSugeridaPedido(producto);
    setPedidoItems((prev) => ({
      ...prev,
      [producto.id]: Math.max(1, Number(prev[producto.id] || 0) + cantidadFinal)
    }));
    showSnackbar(t('Producto agregado al pedido', 'Product added to order'), 'success');
    if (proveedores.length === 0) {
      await fetchProveedores();
    }
  };

// LOGICA PRODUCTOS - FILTRO STOCK BAJO:
// Activa o desactiva el filtro de productos con bajo stock en la lista principal.
  const handleToggleBajoStock = () => {
    if (productosBajoStock.length === 0) {
      showSnackbar(t('No hay productos con bajo stock', 'There are no low-stock products'), 'error');
      return;
    }
    setSoloBajoStock((prev) => !prev);
  };

// LOGICA PEDIDO - CANTIDADES:
// Normaliza cantidades editadas dentro de la orden.
  const handlePedidoCantidadChange = (productoId: number, value: string) => {
    const cantidad = normalizePedidoCantidad(value);
    setPedidoItems((prev) => ({ ...prev, [productoId]: cantidad }));
  };

// LOGICA PEDIDO - QUITAR:
// Quita un producto del pedido antes de generar el PDF.
  const handleRemovePedidoItem = (productoId: number) => {
    setPedidoItems((prev) => {
      const next = { ...prev };
      delete next[productoId];
      return next;
    });
  };

// LOGICA PEDIDO - DESCARGA:
// Descarga blobs generados por el backend.
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

// LOGICA PEDIDO - DNI:
// Consulta el DNI del solicitante y rellena el nombre.
  const handleBuscarDniSolicitante = async () => {
    const dni = solicitanteDni.trim();
    if (!/^\d{8}$/.test(dni)) {
      showSnackbar(t('Ingrese un DNI válido de 8 dígitos', 'Enter a valid 8-digit DNI'), 'error');
      return;
    }
    try {
      setDniLoading(true);
      const persona = await getPersonaPorDni(dni);
      setSolicitanteNombre(persona.nombreCompleto || `${persona.nombres || ''} ${persona.apellidos || ''}`.trim());
    } catch (error) {
      showSnackbar(t('No se pudo consultar el DNI', 'Could not query DNI'), 'error');
    } finally {
      setDniLoading(false);
    }
  };

// LOGICA: handle Create Pedido concentra una operacion de este archivo.
  const handleCreatePedido = async () => {
    if (!proveedorId) {
      showSnackbar(t('Seleccione un proveedor', 'Select a supplier'), 'error');
      return;
    }
    if (pedidoProductos.length === 0) {
      showSnackbar(t('Agregue al menos un producto al pedido', 'Add at least one product to the order'), 'error');
      return;
    }
    if (solicitanteDni.trim() && !/^\d{8}$/.test(solicitanteDni.trim())) {
      showSnackbar(t('El DNI del solicitante debe tener 8 dígitos', 'Requester DNI must have 8 digits'), 'error');
      return;
    }

    try {
      setPedidoLoading(true);
      const boletaConfig = loadBoletaConfig();
      const pedido = await createPedidoCompra({
        proveedorId,
        notas: pedidoNotas || 'Pedido generado desde gestión de productos',
        solicitanteDni: solicitanteDni.trim(),
        solicitanteNombre: solicitanteNombre.trim(),
        comprador: {
          nombre: boletaConfig.nombre,
          ruc: boletaConfig.ruc,
          direccion: boletaConfig.direccion,
          telefono: boletaConfig.telefono
        },
        items: pedidoProductos.map(({ producto, cantidad }) => ({
          productoId: producto.id,
          cantidad
        }))
      });
      try {
        const pdf = await downloadPedidoCompraPdf(pedido.id);
        downloadBlob(pdf, `orden_compra_${pedido.id}.pdf`);
      } catch (pdfError) {
        showSnackbar(t(`Pedido #${pedido.id} creado, pero no se pudo descargar el PDF. Reinicie el backend si acaba de instalar pdfkit.`, `Order #${pedido.id} created, but PDF could not be downloaded.`), 'error');
        return;
      }
      showSnackbar(t(`Pedido de compra #${pedido.id} creado y PDF descargado`, `Purchase order #${pedido.id} created and PDF downloaded`), 'success');
      setPedidoOpen(false);
      setPedidoItems({});
      setPedidoNotas('');
    } catch (error) {
      showSnackbar(getErrorMessage(error, t('No se pudo generar la orden de compra', 'Could not generate purchase order')), 'error');
    } finally {
      setPedidoLoading(false);
    }
  };

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
          <Button
            variant="outlined"
            startIcon={<AssignmentTurnedIn />}
            onClick={handleOpenPedido}
          >
            <Badge badgeContent={pedidoProductos.length} color="error" sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
              {t('Pedido a proveedor', 'Supplier order')}
            </Badge>
          </Button>
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
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 220px' },
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 2
        }}
      >
        <TextField
          label={t('Buscar producto', 'Search product')}
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          fullWidth
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          helperText={t('Busca por nombre, código de barras, descripción o categoría', 'Search by name, barcode, description or category')}
        />
        <FormControl fullWidth>
          <InputLabel id="categoria-filtro-label">{t('Categoría', 'Category')}</InputLabel>
          <Select
            labelId="categoria-filtro-label"
            value={categoriaSeleccionada}
            label={t('Categoría', 'Category')}
            onChange={(event) => setCategoriaSeleccionada(Number(event.target.value))}
          >
            <MenuItem value={0}>{t('Todas', 'All')}</MenuItem>
            {categorias.map((categoria) => (
              <MenuItem key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
            {categorias.map((cat) => (
              <Tab key={cat.id} value={cat.id} label={cat.nombre} />
            ))}
          </Tabs>
        </Paper>
        <Button
          variant={soloBajoStock ? 'contained' : 'outlined'}
          color="error"
          startIcon={<Warning />}
          onClick={handleToggleBajoStock}
          disabled={productosBajoStock.length === 0}
          sx={{ flexShrink: 0, minHeight: 48 }}
        >
          <Badge badgeContent={productosBajoStock.length} color="error">
            {t('Stock bajo (<10)', 'Low stock (<10)')}
          </Badge>
        </Button>
      </Box>

      {productosFiltrados.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('No hay productos para los filtros seleccionados', 'No products match the selected filters')}
          </Typography>
        </Paper>
      ) : (
        categorias
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
                        <TableCell>{t('Código de barras', 'Barcode')}</TableCell>
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
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {producto.codigoBarras || '-'}
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
                              color={isProductoBajoStock(producto) ? 'error' : 'default'}
                              size="small"
                            />
                            {isProductoBajoStock(producto) && (
                              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                {t('Bajo stock', 'Low stock')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={t('Agregar al pedido a proveedor', 'Add to supplier order')}>
                              <IconButton
                                size="small"
                                onClick={() => handleAddToPedido(producto)}
                                color="success"
                              >
                                <ShoppingCart />
                              </IconButton>
                            </Tooltip>
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

      <ProductoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        producto={editingProducto}
        loading={saving}
      />

      {/* DISENO PEDIDO: ventana/modal para rellenar datos y generar la orden de compra al proveedor. */}
      <Dialog open={pedidoOpen} onClose={() => setPedidoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('Pedido a proveedor', 'Supplier order')}</DialogTitle>
        <DialogContent>
          {/* DISENO PEDIDO: contenedor vertical que separa cabecera, solicitante y tabla de productos. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* DISENO PEDIDO: primera fila del formulario, proveedor y notas del pedido. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {/* DISENO PEDIDO: selector de proveedor. LOGICA: proveedorId guarda el proveedor elegido. */}
              <FormControl fullWidth>
                <InputLabel id="proveedor-pedido-label">{t('Proveedor', 'Supplier')}</InputLabel>
                <Select
                  labelId="proveedor-pedido-label"
                  value={proveedorId}
                  label={t('Proveedor', 'Supplier')}
                  onChange={(event) => setProveedorId(Number(event.target.value))}
                >
                  {proveedores.length === 0 ? (
                    <MenuItem value={0} disabled>{t('No hay proveedores disponibles', 'No suppliers available')}</MenuItem>
                  ) : proveedores.map((proveedor) => (
                    <MenuItem key={proveedor.id} value={proveedor.id}>
                      {proveedor.razonSocial} ({proveedor.numeroDocumento})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* DISENO PEDIDO: campo de notas. LOGICA: pedidoNotas se envia al backend como texto opcional. */}
              <TextField
                label={t('Notas (opcional)', 'Notes (optional)')}
                value={pedidoNotas}
                onChange={(event) => setPedidoNotas(event.target.value)}
                inputProps={{ maxLength: 255 }}
              />
            </Box>

            {/* DISENO PEDIDO: bloque de datos de la persona que solicita la compra. */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('Datos del solicitante', 'Requester data')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* DISENO PEDIDO: campo DNI. LOGICA: solo acepta numeros y permite consultar el nombre con el icono. */}
                <TextField
                  label={t('DNI del solicitante', 'Requester DNI')}
                  value={solicitanteDni}
                  onChange={(event) => setSolicitanteDni(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  inputProps={{ maxLength: 8 }}
                  helperText={t('8 dígitos', '8 digits')}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleBuscarDniSolicitante} disabled={dniLoading || solicitanteDni.length !== 8}>
                          <PersonSearch />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                {/* DISENO PEDIDO: nombre del solicitante. LOGICA: se rellena manualmente o desde la consulta DNI. */}
                <TextField
                  label={t('Nombre completo', 'Full name')}
                  value={solicitanteNombre}
                  onChange={(event) => setSolicitanteNombre(event.target.value)}
                  inputProps={{ maxLength: 160 }}
                />
              </Box>
            </Box>

            {/* DISENO PEDIDO: resumen de productos agregados al pedido. */}
            <Typography variant="subtitle2">
              {t('Productos del pedido', 'Order products')} ({pedidoProductos.length}) | {t('Cantidad total:', 'Total quantity:')} {totalPedidoCantidad}
            </Typography>

            {/* DISENO PEDIDO: tabla donde se revisan productos, stock actual, cantidades y eliminacion. */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('Producto', 'Product')}</TableCell>
                    <TableCell align="right">{t('Stock actual', 'Current stock')}</TableCell>
                    <TableCell align="right">{t('Cantidad', 'Quantity')}</TableCell>
                    <TableCell align="center">{t('Quitar', 'Remove')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidoProductos.length === 0 ? (
                    // DISENO PEDIDO: mensaje cuando todavia no se agregaron productos al pedido.
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Alert severity="info">
                          {t('Use el carrito (+) en la lista de productos o agregue productos de stock bajo.', 'Use the cart (+) in the product list or add low-stock products.')}
                        </Alert>
                      </TableCell>
                    </TableRow>
                  ) : pedidoProductos.map(({ producto, cantidad }) => (
                    // DISENO PEDIDO: fila de producto agregado. LOGICA: cantidad se puede editar antes de generar el PDF.
                    <TableRow key={producto.id}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">{producto.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{producto.descripcion || '-'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={producto.stockActual}
                          color={isProductoBajoStock(producto) ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={cantidad}
                          onChange={(event) => handlePedidoCantidadChange(producto.id, event.target.value)}
                          inputProps={{ min: 1, step: 1, style: { textAlign: 'right' } }}
                          sx={{ width: 96 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleRemovePedidoItem(producto.id)}>
                          <RemoveCircleOutline />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          {/* DISENO PEDIDO: boton cancelar. LOGICA: cierra el modal sin crear pedido. */}
          <Button onClick={() => setPedidoOpen(false)} disabled={pedidoLoading}>
            {t('Cancelar', 'Cancel')}
          </Button>
          {/* DISENO PEDIDO: boton final. LOGICA: crea el pedido en backend y descarga el PDF. */}
          <Button
            variant="contained"
            onClick={handleCreatePedido}
            disabled={pedidoLoading || !proveedorId || pedidoProductos.length === 0}
          >
            {pedidoLoading ? t('Generando...', 'Generating...') : t('Generar y descargar PDF', 'Generate and download PDF')}
          </Button>
        </DialogActions>
      </Dialog>

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
