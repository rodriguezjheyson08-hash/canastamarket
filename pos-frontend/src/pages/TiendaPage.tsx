import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import ClienteHeader from '../components/layout/ClienteHeader';
import { Categoria, Producto } from '../types';
import { getCategorias, getProductos } from '../services/api';
import { useClienteCart } from '../contexts/ClienteCartContext';
import { useI18n } from '../hooks/useI18n';

const placeholderImg = 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png';

const TiendaPage: React.FC = () => {
  const { t } = useI18n();
  const { addItem, count } = useClienteCart();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | 'all'>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [productosResult, categoriasResult] = await Promise.allSettled([
          getProductos(),
          getCategorias()
        ]);

        if (productosResult.status === 'fulfilled') {
          setProductos(Array.isArray(productosResult.value) ? productosResult.value : []);
        } else {
          setProductos([]);
          setError(
            String(productosResult.reason?.message || t('Error al cargar productos', 'Error loading products'))
          );
        }

        if (categoriasResult.status === 'fulfilled') {
          setCategorias(Array.isArray(categoriasResult.value) ? categoriasResult.value : []);
        } else {
          setCategorias([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const visibles = useMemo(
    () => productos.filter(p => p.activo !== false && Number(p.stockActual || 0) > 0),
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return visibles.filter((p) => {
      const coincideCategoria =
        categoriaSeleccionada === 'all' || Number(p.categoriaId) === Number(categoriaSeleccionada);
      if (!coincideCategoria) return false;
      if (!termino) return true;
      const nombre = String(p.nombre || '').toLowerCase();
      const descripcion = String(p.descripcion || '').toLowerCase();
      return nombre.includes(termino) || descripcion.includes(termino);
    });
  }, [visibles, busqueda, categoriaSeleccionada]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f4f7fb' }}>
      <ClienteHeader />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" alignItems="baseline" justifyContent="space-between" mb={2} gap={2} flexWrap="wrap">
          <Typography variant="h4" component="h1" fontWeight={900}>
            {t('Productos disponibles', 'Available products')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('En carrito:', 'In cart:')} {count}
          </Typography>
        </Box>

        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }}
          gap={2}
          mb={2}
        >
          <TextField
            label={t('Buscar producto', 'Search product')}
            placeholder={t('Escribe nombre o descripción...', 'Type name or description...')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="categoria-tienda-label">{t('Categoría', 'Category')}</InputLabel>
            <Select
              labelId="categoria-tienda-label"
              label={t('Categoría', 'Category')}
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value as number | 'all')}
            >
              <MenuItem value="all">{t('Todas', 'All')}</MenuItem>
              {categorias.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && productosFiltrados.length === 0 && (
          <Alert severity="info">{t('No hay productos disponibles.', 'No products available.')}</Alert>
        )}

        <Grid container spacing={3} justifyContent="center">
          {productosFiltrados.map((p) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
              <Card
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2,
                  minHeight: 265,
                  height: 'auto',
                  minWidth: 0,
                  boxShadow: 3
                }}
              >
                <CardMedia
                  component="img"
                  image={p.imagen || placeholderImg}
                  alt={p.nombre}
                  sx={{
                    width: 70,
                    height: 120,
                    objectFit: 'contain',
                    borderRadius: 2,
                    bgcolor: '#f5f5f5',
                    mb: 1
                  }}
                />
                <CardContent sx={{ flex: 1, width: '100%', textAlign: 'center', p: 0, mt: 0.5 }}>
                  <Typography
                    variant="h6"
                    fontWeight={900}
                    sx={{
                      width: '100%',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.2
                    }}
                    gutterBottom
                  >
                    {p.nombre}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1,
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minHeight: 20
                    }}
                  >
                    {p.descripcion || t('Sin descripción', 'No description')}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" color="primary" fontWeight={900}>
                      S/ {Number(p.precioVenta || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('Stock:', 'Stock:')} {p.stockActual}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ width: '100%', p: 0, mt: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => addItem(p, 1)}
                    disabled={Number(p.stockActual || 0) <= 0}
                  >
                    {t('Agregar al carrito', 'Add to cart')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default TiendaPage;
