/*
 * MAPA DEL ARCHIVO: FORMULARIO FRONTEND
 * UBICACION: pos-frontend/src/components/forms/ProveedorForm.tsx
 * QUE HACE: Contiene campos, validaciones visuales y envio de datos de un formulario.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import SearchIcon from '@mui/icons-material/Search';
import { Proveedor } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { consultarRuc } from '../../services/proveedores';
import { proveedorFormGridStyles, proveedorFormWarningStyles } from '../../features/proveedores/styles';

// TIPOS FRONTEND: alias ProveedorFormData para ordenar datos internos.
type ProveedorFormData = {
  numeroDocumento: string;
  razonSocial: string;
  direccion: string;
  estado: string;
  condicion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
};

// TIPOS FRONTEND: props/datos ProveedorFormProps usados por este componente.
interface ProveedorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (proveedor: Partial<Proveedor>) => void;
  proveedor?: Proveedor;
  loading?: boolean;
}

// LOGICA: valores iniciales del formulario cuando se crea un proveedor nuevo.
const emptyForm = (): ProveedorFormData => ({
  numeroDocumento: '',
  razonSocial: '',
  direccion: '',
  estado: '',
  condicion: '',
  distrito: '',
  provincia: '',
  departamento: '',
  contactoNombre: '',
  contactoTelefono: '',
  contactoEmail: ''
});

const ProveedorForm: React.FC<ProveedorFormProps> = ({ open, onClose, onSubmit, proveedor, loading = false }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<ProveedorFormData>(emptyForm());
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // LOGICA: cuando se edita un proveedor carga sus datos; si es nuevo, limpia el formulario.
  useEffect(() => {
    if (proveedor) {
      setFormData({
        numeroDocumento: proveedor.numeroDocumento || '',
        razonSocial: proveedor.razonSocial || '',
        direccion: proveedor.direccion || '',
        estado: proveedor.estado || '',
        condicion: proveedor.condicion || '',
        distrito: proveedor.distrito || '',
        provincia: proveedor.provincia || '',
        departamento: proveedor.departamento || '',
        contactoNombre: proveedor.contactoNombre || '',
        contactoTelefono: proveedor.contactoTelefono || '',
        contactoEmail: proveedor.contactoEmail || ''
      });
    } else {
      setFormData(emptyForm());
    }
    setLookupError('');
    setLookupLoading(false);
  }, [proveedor, open]);

  // LOGICA: valida que el RUC tenga exactamente 11 digitos para habilitar busqueda/guardado.
  const isRucValid = useMemo(() => /^\d{11}$/.test(formData.numeroDocumento.trim()), [formData.numeroDocumento]);
  const telefonoError = useMemo(() => {
    const value = formData.contactoTelefono.trim();
    return value !== '' && !/^\d{9}$/.test(value);
  }, [formData.contactoTelefono]);

  // LOGICA: controla lo que se escribe en cada campo; RUC y telefono solo aceptan numeros.
  const handleChange = (field: keyof ProveedorFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (field === 'numeroDocumento') {
      setFormData((prev) => ({ ...prev, numeroDocumento: value.replace(/\D/g, '').slice(0, 11) }));
      return;
    }
    if (field === 'contactoTelefono') {
      setFormData((prev) => ({ ...prev, contactoTelefono: value.replace(/\D/g, '').slice(0, 9) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // LOGICA: boton de lupa del campo RUC; consulta datos SUNAT y rellena razon social/direccion.
  const handleLookup = async () => {
    setLookupError('');
    const ruc = formData.numeroDocumento.trim();
    if (!/^\d{11}$/.test(ruc)) {
      setLookupError(t('El RUC debe tener 11 dígitos.', 'RUC must have 11 digits.'));
      return;
    }

    setLookupLoading(true);
    try {
      const data = await consultarRuc(ruc);
      setFormData((prev) => ({
        ...prev,
        numeroDocumento: String(data?.numero_documento || ruc),
        razonSocial: String(data?.razon_social || prev.razonSocial || ''),
        direccion: String(data?.direccion || prev.direccion || ''),
        estado: String(data?.estado || prev.estado || ''),
        condicion: String(data?.condicion || prev.condicion || ''),
        distrito: String(data?.distrito || prev.distrito || ''),
        provincia: String(data?.provincia || prev.provincia || ''),
        departamento: String(data?.departamento || prev.departamento || '')
      }));
    } catch (error: any) {
      const message = String(error?.response?.data?.message || error?.message || '').trim();
      setLookupError(message || t('No se pudo consultar RUC.', 'Could not look up RUC.'));
    } finally {
      setLookupLoading(false);
    }
  };

  // LOGICA: boton Crear/Actualizar; envia los datos del formulario a la pagina principal.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (telefonoError) {
      setLookupError(t('El teléfono debe tener 9 dígitos.', 'Phone must have 9 digits.'));
      return;
    }

    onSubmit({
      numeroDocumento: formData.numeroDocumento.trim(),
      razonSocial: formData.razonSocial.trim(),
      direccion: formData.direccion.trim() || null,
      estado: formData.estado.trim() || null,
      condicion: formData.condicion.trim() || null,
      distrito: formData.distrito.trim() || null,
      provincia: formData.provincia.trim() || null,
      departamento: formData.departamento.trim() || null,
      contactoNombre: formData.contactoNombre.trim() || null,
      contactoTelefono: formData.contactoTelefono.trim() || null,
      contactoEmail: formData.contactoEmail.trim() || null
    });
  };

  return (
    // DISENO: ventana emergente que se abre con "+ Nuevo" o con el icono de editar.
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {proveedor ? t('Editar Proveedor', 'Edit Supplier') : t('Nuevo Proveedor', 'New Supplier')}
        </DialogTitle>
        <DialogContent>
          {/* DISENO: espacio de campos; una columna en celular y dos columnas en pantallas medianas. */}
          <Box sx={proveedorFormGridStyles}>
            <TextField
              label={t('RUC', 'RUC')}
              value={formData.numeroDocumento}
              onChange={handleChange('numeroDocumento')}
              required
              fullWidth
              inputProps={{ inputMode: 'numeric' }}
              helperText={t('11 dígitos', '11 digits')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {/* DISENO: icono de lupa. LOGICA: llama handleLookup para buscar el RUC ingresado. */}
                    <IconButton
                      aria-label={t('Buscar RUC', 'Search RUC')}
                      onClick={handleLookup}
                      disabled={lookupLoading || loading || !isRucValid}
                      edge="end"
                    >
                      {lookupLoading ? <CircularProgress size={18} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField label={t('Razón social', 'Business name')} value={formData.razonSocial} onChange={handleChange('razonSocial')} required fullWidth />
            <TextField label={t('Dirección', 'Address')} value={formData.direccion} onChange={handleChange('direccion')} fullWidth />
            <TextField label={t('Contacto', 'Contact')} value={formData.contactoNombre} onChange={handleChange('contactoNombre')} fullWidth />
            <TextField
              label={t('Teléfono', 'Phone')}
              value={formData.contactoTelefono}
              onChange={handleChange('contactoTelefono')}
              fullWidth
              type="tel"
              error={telefonoError}
              helperText={telefonoError ? t('Debe tener 9 dígitos.', 'Must be 9 digits.') : t('9 dígitos', '9 digits')}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 9 }}
            />
            <TextField label={t('Email', 'Email')} value={formData.contactoEmail} onChange={handleChange('contactoEmail')} fullWidth type="email" />
            <TextField label={t('Estado', 'Status')} value={formData.estado} onChange={handleChange('estado')} fullWidth />
            <TextField label={t('Condición', 'Condition')} value={formData.condicion} onChange={handleChange('condicion')} fullWidth />
            <TextField label={t('Distrito', 'District')} value={formData.distrito} onChange={handleChange('distrito')} fullWidth />
            <TextField label={t('Provincia', 'Province')} value={formData.provincia} onChange={handleChange('provincia')} fullWidth />
            <TextField label={t('Departamento', 'Region')} value={formData.departamento} onChange={handleChange('departamento')} fullWidth />
          </Box>

          {/* DISENO: mensaje de advertencia. LOGICA: aparece cuando lookupError tiene texto. */}
          {lookupError && (
            <Alert severity="warning" sx={proveedorFormWarningStyles}>
              {lookupError}
            </Alert>
          )}
        </DialogContent>
        {/* DISENO: botones inferiores del modal: Cancelar y Crear/Actualizar. */}
        <DialogActions>
          <Button onClick={onClose} disabled={loading || lookupLoading}>
            {t('Cancelar', 'Cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading || lookupLoading || !isRucValid || !formData.razonSocial.trim() || telefonoError}>
            {loading ? t('Guardando...', 'Saving...') : proveedor ? t('Actualizar', 'Update') : t('Crear', 'Create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProveedorForm;
