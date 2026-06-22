/*
 * MAPA DEL ARCHIVO: FORMULARIO FRONTEND
 * UBICACION: pos-frontend/src/components/forms/ProductoForm.tsx
 * QUE HACE: Contiene campos, validaciones visuales y envio de datos de un formulario.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Avatar,
  IconButton,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { QrCodeScanner } from '@mui/icons-material';
import { Producto, Categoria } from '../../types';
import { getCategorias } from '../../services/api';
import { useI18n } from '../../hooks/useI18n';
import BarcodeScannerDialog from '../common/BarcodeScannerDialog';

const imagenesBebidas: Record<string, string> = {
  'Ron Barceló': 'https://www.licoresmedellin.com/cdn/shop/products/ron-barcelo-anejo-700ml.jpg?v=1677692782',
  'Cerveza Corona': 'https://www.latiendadelcervecero.com/cdn/shop/products/Corona355ml.png?v=1614359782',
  'Tequila Don Julio': 'https://cdn.shopify.com/s/files/1/0257/6089/3921/products/tequila-don-julio-reposado-750ml.png?v=1642521072',
  'Whisky Johnnie Walker': 'https://www.licoresmedellin.com/cdn/shop/products/whisky-johnnie-walker-red-label-700ml.jpg?v=1677692782',
  'Vodka Smirnoff': 'https://www.latiendadelcervecero.com/cdn/shop/products/Smirnoff700ml.png?v=1614359782',
};

// TIPOS FRONTEND: props/datos ProductoFormProps usados por este componente.
interface ProductoFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (producto: Omit<Producto, 'id'> & { imagen?: string }) => void;
  producto?: Producto & { imagen?: string };
  loading?: boolean;
}

// Tipo local para el formulario
// TIPOS FRONTEND: props/datos ProductoFormData usados por este componente.
interface ProductoFormData {
  nombre: string;
  descripcion: string;
  precioVenta: string;
  codigoBarras: string;
  stock: string;
  imagen?: string;
  categoriaId: number;
}

// LOGICA: block Invalid Number Key concentra una operacion de este archivo.
const blockInvalidNumberKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (['-', '+', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
  }
};

// LOGICA: normalize Decimal Input concentra una operacion de este archivo.
const normalizeDecimalInput = (rawValue: string) => {
  const normalized = rawValue.replace(',', '.').replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = normalized.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  return decimalParts.length > 0 ? `${integerPart}.${decimals}` : integerPart;
};

// LOGICA: normalize Integer Input concentra una operacion de este archivo.
const normalizeIntegerInput = (rawValue: string) => rawValue.replace(/\D/g, '');

const ProductoForm: React.FC<ProductoFormProps> = ({
  open,
  onClose,
  onSubmit,
  producto,
  loading = false
}) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<ProductoFormData>({
    nombre: '',
    descripcion: '',
    precioVenta: '',
    codigoBarras: '',
    stock: '',
    imagen: '',
    categoriaId: 0
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [precioError, setPrecioError] = useState('');
  const [stockError, setStockError] = useState('');
  const [nombreError, setNombreError] = useState('');
  const [categoriaError, setCategoriaError] = useState('');
  const [imagenError, setImagenError] = useState('');
  const [codigoBarrasError, setCodigoBarrasError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precioVenta: producto.precioVenta ? producto.precioVenta.toString() : '',
        codigoBarras: producto.codigoBarras || '',
        stock: producto.stockActual !== undefined && producto.stockActual !== null ? producto.stockActual.toString() : '',
        imagen: (producto as any).imagen || '',
        categoriaId: producto.categoriaId || 0
      });
      setLocalImage(null);
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        precioVenta: '',
        codigoBarras: '',
        stock: '',
        imagen: '',
        categoriaId: 0
      });
      setLocalImage(null);
    }
  }, [producto]);

  useEffect(() => {
    let active = true;
// LOGICA: load Categorias concentra una operacion de este archivo.
    const loadCategorias = async () => {
      try {
        const data = await getCategorias();
        if (active) setCategorias(data);
      } catch (error) {
        if (active) setCategorias([]);
      }
    };
    if (open) {
      loadCategorias();
    }
    return () => {
      active = false;
    };
  }, [open]);

// LOGICA: validate Field concentra una operacion de este archivo.
  const validateField = (field: keyof ProductoFormData, value: string) => {
    if (field === 'precioVenta') {
      const precioNum = parseFloat(value);
      if (value === '' || isNaN(precioNum) || precioNum <= 0) {
        return t('El precio debe ser mayor a 0', 'Price must be greater than 0');
      }
    }
    if (field === 'stock') {
      const stockNum = parseInt(value);
      if (value === '' || isNaN(stockNum) || stockNum < 0) {
        return t('El stock es obligatorio y no puede ser negativo', 'Stock is required and cannot be negative');
      }
    }
    return '';
  };

// LOGICA: validate Image Url concentra una operacion de este archivo.
  const validateImageUrl = (url: string) => {
    if (!url) return '';
    try {
      new URL(url);
      return '';
    } catch {
      return t('URL de imagen no válida', 'Invalid image URL');
    }
  };

// LOGICA: handle Change concentra una operacion de este archivo.
  const handleChange = (field: keyof ProductoFormData) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    let value: any = event.target.value;
    if (field === 'precioVenta') {
      value = normalizeDecimalInput(String(value));
      setPrecioError(validateField('precioVenta', value));
    }
    if (field === 'stock') {
      value = normalizeIntegerInput(String(value));
      setStockError(validateField('stock', value));
    }
    if (field === 'nombre') {
      setNombreError(value.trim() === '' ? t('El nombre es obligatorio', 'Name is required') : '');
    }
    if (field === 'codigoBarras') {
      value = String(value).trim();
      setCodigoBarrasError(value.length > 80 ? t('El código de barras no puede superar 80 caracteres', 'Barcode cannot exceed 80 characters') : '');
    }
    if (field === 'imagen') {
      setImagenError(validateImageUrl(value));
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

// LOGICA: handle Select Change concentra una operacion de este archivo.
  const handleSelectChange = (event: SelectChangeEvent<number>) => {
    setFormData(prev => ({
      ...prev,
      categoriaId: Number(event.target.value)
    }));
    setCategoriaError(Number(event.target.value) === 0 ? t('Seleccione una categoría', 'Select a category') : '');
  };

// LOGICA: handle Image Change concentra una operacion de este archivo.
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLocalImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

// LOGICA: handle Codigo Detectado concentra una operacion de este archivo.
  const handleCodigoDetectado = (codigo: string) => {
    const value = codigo.trim();
    setFormData(prev => ({
      ...prev,
      codigoBarras: value
    }));
    setCodigoBarrasError(value.length > 80 ? t('El código de barras no puede superar 80 caracteres', 'Barcode cannot exceed 80 characters') : '');
  };

// LOGICA: handle Submit concentra una operacion de este archivo.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    let valid = true;
    if (formData.nombre.trim() === '') {
      setNombreError(t('El nombre es obligatorio', 'Name is required'));
      valid = false;
    } else {
      setNombreError('');
    }
    if (formData.precioVenta === '' || isNaN(Number(formData.precioVenta)) || Number(formData.precioVenta) <= 0) {
      setPrecioError(t('El precio debe ser mayor a 0', 'Price must be greater than 0'));
      valid = false;
    } else {
      setPrecioError('');
    }
    if (formData.stock === '' || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      setStockError(t('El stock es obligatorio y no puede ser negativo', 'Stock is required and cannot be negative'));
      valid = false;
    } else {
      setStockError('');
    }
    if (formData.categoriaId === 0) {
      setCategoriaError(t('Seleccione una categoría', 'Select a category'));
      valid = false;
    } else {
      setCategoriaError('');
    }
    if (formData.imagen && validateImageUrl(formData.imagen)) {
      setImagenError(t('URL de imagen no válida', 'Invalid image URL'));
      valid = false;
    } else {
      setImagenError('');
    }
    if (formData.codigoBarras.trim().length > 80) {
      setCodigoBarrasError(t('El código de barras no puede superar 80 caracteres', 'Barcode cannot exceed 80 characters'));
      valid = false;
    } else {
      setCodigoBarrasError('');
    }
    if (!valid) return;
    let imagenFinal: string | undefined = undefined;
    if (localImage && localImage.trim() !== '') {
      imagenFinal = localImage;
    } else if (formData.imagen && formData.imagen.trim() !== '') {
      imagenFinal = formData.imagen;
    } else if (producto?.imagen && producto.imagen.trim() !== '') {
      imagenFinal = producto.imagen;
    }
    onSubmit({
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precioVenta: Number(formData.precioVenta),
      codigoBarras: formData.codigoBarras.trim() || null,
      stockActual: Number(formData.stock),
      ...(imagenFinal ? { imagen: imagenFinal } : {}),
      categoriaId: formData.categoriaId
    });
  };

  // Imagen de vista previa
  const imagenPreview = localImage
    || formData.imagen
    || (producto && producto.imagen)
    || imagenesBebidas[formData.nombre]
    || 'https://cdn-icons-png.flaticon.com/512/2738/2738897.png';

  // Log para depuración

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {producto ? t('Editar Producto', 'Edit Product') : t('Nuevo Producto', 'New Product')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('Nombre', 'Name')}
              value={formData.nombre}
              onChange={handleChange('nombre')}
              required
              fullWidth
              error={!!nombreError}
              helperText={nombreError}
            />
            <TextField
              label={t('Descripción', 'Description')}
              value={formData.descripcion}
              onChange={handleChange('descripcion')}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label={t('Precio', 'Price')}
              type="text"
              value={formData.precioVenta}
              onChange={handleChange('precioVenta')}
              onKeyDown={blockInvalidNumberKey}
              required
              fullWidth
              inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
              error={!!precioError}
              helperText={precioError}
            />
            <TextField
              label={t('Código de barras', 'Barcode')}
              value={formData.codigoBarras}
              onChange={handleChange('codigoBarras')}
              fullWidth
              autoComplete="off"
              inputProps={{ maxLength: 80, inputMode: 'numeric' }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setScannerOpen(true)}
                      aria-label={t('Escanear código de barras', 'Scan barcode')}
                    >
                      <QrCodeScanner />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              error={!!codigoBarrasError}
              helperText={codigoBarrasError || t('Escanea o escribe el código del producto', 'Scan or type the product code')}
            />
            <TextField
              label={t('Stock', 'Stock')}
              type="text"
              value={formData.stock}
              onChange={handleChange('stock')}
              onKeyDown={blockInvalidNumberKey}
              required
              fullWidth
              inputProps={{ min: 0, step: 1, inputMode: 'numeric', pattern: '[0-9]*' }}
              error={!!stockError}
              helperText={stockError}
            />
            <FormControl fullWidth required error={!!categoriaError}>
              <InputLabel id="categoria-label">{t('Categoría', 'Category')}</InputLabel>
              <Select
                labelId="categoria-label"
                value={formData.categoriaId}
                label={t('Categoría', 'Category')}
                onChange={handleSelectChange}
              >
                <MenuItem value={0} disabled>{t('Seleccione una categoría', 'Select a category')}</MenuItem>
                {categorias.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                ))}
              </Select>
              {categoriaError && <span style={{ color: 'red', fontSize: 12 }}>{categoriaError}</span>}
            </FormControl>
            <Box display="flex" alignItems="center" gap={2} mt={2}>
              <Avatar
                variant="rounded"
                src={imagenPreview}
                alt={formData.nombre}
                sx={{ width: 56, height: 80, bgcolor: '#f5f5f5' }}
              />
              <Button
                variant="outlined"
                component="label"
                size="small"
                sx={{ minWidth: 120 }}
              >
                {t('Seleccionar imagen', 'Select image')}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />
              </Button>
              <TextField
                label={t('URL de la imagen', 'Image URL')}
                value={formData.imagen}
                onChange={handleChange('imagen')}
                error={!!imagenError}
                helperText={imagenError || t('Pega la URL de la imagen o déjalo vacío para usar la predeterminada', 'Paste the image URL or leave it empty to use the default one')}
                fullWidth
                placeholder={t('Pega la URL de la imagen o déjalo vacío para usar la predeterminada', 'Paste the image URL or leave it empty to use the default one')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('Cancelar', 'Cancel')}
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.nombre}
          >
            {loading ? t('Guardando...', 'Saving...') : (producto ? t('Actualizar', 'Update') : t('Crear', 'Create'))}
          </Button>
        </DialogActions>
      </form>
      <BarcodeScannerDialog
        open={scannerOpen}
        title={t('Escanear código de barras', 'Scan barcode')}
        onClose={() => setScannerOpen(false)}
        onDetected={handleCodigoDetectado}
      />
    </Dialog>
  );
};

export default ProductoForm; 
