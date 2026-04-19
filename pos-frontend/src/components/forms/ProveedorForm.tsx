import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Typography,
  TextField
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Proveedor } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { consultarRuc } from '../../services/proveedores';

type ProveedorFormData = {
  numeroDocumento: string;
  razonSocial: string;
  direccion: string;
  estado: string;
  condicion: string;
  ubigeo: string;
  viaTipo: string;
  viaNombre: string;
  zonaCodigo: string;
  zonaTipo: string;
  numero: string;
  interior: string;
  lote: string;
  dpto: string;
  manzana: string;
  kilometro: string;
  distrito: string;
  provincia: string;
  departamento: string;
  tipo: string;
  actividadEconomica: string;
  numeroTrabajadores: string;
  tipoFacturacion: string;
  tipoContabilidad: string;
  comercioExterior: string;
  esAgenteRetencion: boolean;
  esBuenContribuyente: boolean;
  localesAnexos: any;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
};

interface ProveedorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (proveedor: Partial<Proveedor>) => void;
  proveedor?: Proveedor;
  loading?: boolean;
}

const emptyForm = (): ProveedorFormData => ({
  numeroDocumento: '',
  razonSocial: '',
  direccion: '',
  estado: '',
  condicion: '',
  ubigeo: '',
  viaTipo: '',
  viaNombre: '',
  zonaCodigo: '',
  zonaTipo: '',
  numero: '',
  interior: '',
  lote: '',
  dpto: '',
  manzana: '',
  kilometro: '',
  distrito: '',
  provincia: '',
  departamento: '',
  tipo: '',
  actividadEconomica: '',
  numeroTrabajadores: '',
  tipoFacturacion: '',
  tipoContabilidad: '',
  comercioExterior: '',
  esAgenteRetencion: false,
  esBuenContribuyente: false,
  localesAnexos: null,
  contactoNombre: '',
  contactoTelefono: '',
  contactoEmail: ''
});

const ProveedorForm: React.FC<ProveedorFormProps> = ({ open, onClose, onSubmit, proveedor, loading = false }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<ProveedorFormData>(emptyForm());
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    if (proveedor) {
      setFormData({
        numeroDocumento: proveedor.numeroDocumento || '',
        razonSocial: proveedor.razonSocial || '',
        direccion: proveedor.direccion || '',
        estado: proveedor.estado || '',
        condicion: proveedor.condicion || '',
        ubigeo: proveedor.ubigeo || '',
        viaTipo: proveedor.viaTipo || '',
        viaNombre: proveedor.viaNombre || '',
        zonaCodigo: proveedor.zonaCodigo || '',
        zonaTipo: proveedor.zonaTipo || '',
        numero: proveedor.numero || '',
        interior: proveedor.interior || '',
        lote: proveedor.lote || '',
        dpto: proveedor.dpto || '',
        manzana: proveedor.manzana || '',
        kilometro: proveedor.kilometro || '',
        distrito: proveedor.distrito || '',
        provincia: proveedor.provincia || '',
        departamento: proveedor.departamento || '',
        tipo: proveedor.tipo || '',
        actividadEconomica: proveedor.actividadEconomica || '',
        numeroTrabajadores:
          proveedor.numeroTrabajadores === null || proveedor.numeroTrabajadores === undefined
            ? ''
            : String(proveedor.numeroTrabajadores),
        tipoFacturacion: proveedor.tipoFacturacion || '',
        tipoContabilidad: proveedor.tipoContabilidad || '',
        comercioExterior: proveedor.comercioExterior || '',
        esAgenteRetencion: Boolean(proveedor.esAgenteRetencion),
        esBuenContribuyente: Boolean(proveedor.esBuenContribuyente),
        localesAnexos: proveedor.localesAnexos ?? null,
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

  const isRucValid = useMemo(() => /^\d{11}$/.test(formData.numeroDocumento.trim()), [formData.numeroDocumento]);
  const telefonoError = useMemo(() => {
    const v = formData.contactoTelefono.trim();
    return v !== '' && !/^\d{9}$/.test(v);
  }, [formData.contactoTelefono]);

  const handleChange = (field: keyof ProveedorFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (field === 'numeroDocumento') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setFormData((prev) => ({ ...prev, numeroDocumento: digits }));
      return;
    }
    if (field === 'contactoTelefono') {
      const digits = value.replace(/\D/g, '').slice(0, 9);
      setFormData((prev) => ({ ...prev, contactoTelefono: digits }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
        ubigeo: String(data?.ubigeo || prev.ubigeo || ''),
        viaTipo: String(data?.via_tipo || prev.viaTipo || ''),
        viaNombre: String(data?.via_nombre || prev.viaNombre || ''),
        zonaCodigo: String(data?.zona_codigo || prev.zonaCodigo || ''),
        zonaTipo: String(data?.zona_tipo || prev.zonaTipo || ''),
        numero: String(data?.numero || prev.numero || ''),
        interior: String(data?.interior || prev.interior || ''),
        lote: String(data?.lote || prev.lote || ''),
        dpto: String(data?.dpto || prev.dpto || ''),
        manzana: String(data?.manzana || prev.manzana || ''),
        kilometro: String(data?.kilometro || prev.kilometro || ''),
        distrito: String(data?.distrito || prev.distrito || ''),
        provincia: String(data?.provincia || prev.provincia || ''),
        departamento: String(data?.departamento || prev.departamento || ''),
        tipo: String(data?.tipo || prev.tipo || ''),
        actividadEconomica: String(data?.actividad_economica || prev.actividadEconomica || ''),
        numeroTrabajadores:
          data?.numero_trabajadores === null || data?.numero_trabajadores === undefined
            ? prev.numeroTrabajadores
            : String(data?.numero_trabajadores),
        tipoFacturacion: String(data?.tipo_facturacion || prev.tipoFacturacion || ''),
        tipoContabilidad: String(data?.tipo_contabilidad || prev.tipoContabilidad || ''),
        comercioExterior: String(data?.comercio_exterior || prev.comercioExterior || ''),
        esAgenteRetencion: Boolean(data?.es_agente_retencion),
        esBuenContribuyente: Boolean(data?.es_buen_contribuyente),
        localesAnexos: data?.locales_anexos ?? prev.localesAnexos
      }));
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '').trim();
      setLookupError(message || t('No se pudo consultar RUC.', 'Could not look up RUC.'));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (telefonoError) {
      setLookupError(t('El teléfono debe tener 9 dígitos.', 'Phone must be 9 digits.'));
      return;
    }
    setLookupError('');
    const payload: Partial<Proveedor> = {
      numeroDocumento: formData.numeroDocumento.trim(),
      razonSocial: formData.razonSocial.trim(),
      direccion: formData.direccion.trim() || null,
      estado: formData.estado.trim() || null,
      condicion: formData.condicion.trim() || null,
      ubigeo: formData.ubigeo.trim() || null,
      viaTipo: formData.viaTipo.trim() || null,
      viaNombre: formData.viaNombre.trim() || null,
      zonaCodigo: formData.zonaCodigo.trim() || null,
      zonaTipo: formData.zonaTipo.trim() || null,
      numero: formData.numero.trim() || null,
      interior: formData.interior.trim() || null,
      lote: formData.lote.trim() || null,
      dpto: formData.dpto.trim() || null,
      manzana: formData.manzana.trim() || null,
      kilometro: formData.kilometro.trim() || null,
      distrito: formData.distrito.trim() || null,
      provincia: formData.provincia.trim() || null,
      departamento: formData.departamento.trim() || null,
      tipo: formData.tipo.trim() || null,
      actividadEconomica: formData.actividadEconomica.trim() || null,
      numeroTrabajadores: formData.numeroTrabajadores.trim() ? Number(formData.numeroTrabajadores) : null,
      tipoFacturacion: formData.tipoFacturacion.trim() || null,
      tipoContabilidad: formData.tipoContabilidad.trim() || null,
      comercioExterior: formData.comercioExterior.trim() || null,
      esAgenteRetencion: formData.esAgenteRetencion,
      esBuenContribuyente: formData.esBuenContribuyente,
      localesAnexos: formData.localesAnexos ?? null,
	      contactoNombre: formData.contactoNombre.trim() || null,
	      contactoTelefono: formData.contactoTelefono.trim() || null,
	      contactoEmail: formData.contactoEmail.trim() || null
	    };
	    onSubmit(payload);
	  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {proveedor ? t('Editar Proveedor', 'Edit Supplier') : t('Nuevo Proveedor', 'New Supplier')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
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
            <TextField
              label={t('Razón social', 'Business name')}
              value={formData.razonSocial}
              onChange={handleChange('razonSocial')}
              required
              fullWidth
            />
            <TextField
              label={t('Dirección', 'Address')}
              value={formData.direccion}
              onChange={handleChange('direccion')}
              fullWidth
            />
            <TextField
              label={t('Contacto', 'Contact')}
              value={formData.contactoNombre}
              onChange={handleChange('contactoNombre')}
              fullWidth
            />
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
            <TextField
              label={t('Email', 'Email')}
              value={formData.contactoEmail}
              onChange={handleChange('contactoEmail')}
              fullWidth
              type="email"
            />
            <TextField
              label={t('Estado', 'Status')}
              value={formData.estado}
              onChange={handleChange('estado')}
              fullWidth
            />
            <TextField
              label={t('Condición', 'Condition')}
              value={formData.condicion}
              onChange={handleChange('condicion')}
              fullWidth
            />
            <TextField label={t('Distrito', 'District')} value={formData.distrito} onChange={handleChange('distrito')} fullWidth />
            <TextField label={t('Provincia', 'Province')} value={formData.provincia} onChange={handleChange('provincia')} fullWidth />
            <TextField label={t('Departamento', 'Region')} value={formData.departamento} onChange={handleChange('departamento')} fullWidth />
            <TextField label={t('Ubigeo', 'Ubigeo')} value={formData.ubigeo} onChange={handleChange('ubigeo')} fullWidth />
          </Box>

          <Accordion sx={{ mt: 2 }} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">{t('Datos SUNAT (opcional)', 'SUNAT data (optional)')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField label={t('Vía tipo', 'Road type')} value={formData.viaTipo} onChange={handleChange('viaTipo')} fullWidth />
                <TextField label={t('Vía nombre', 'Road name')} value={formData.viaNombre} onChange={handleChange('viaNombre')} fullWidth />
                <TextField label={t('Zona código', 'Zone code')} value={formData.zonaCodigo} onChange={handleChange('zonaCodigo')} fullWidth />
                <TextField label={t('Zona tipo', 'Zone')} value={formData.zonaTipo} onChange={handleChange('zonaTipo')} fullWidth />
                <TextField label={t('Número', 'Number')} value={formData.numero} onChange={handleChange('numero')} fullWidth />
                <TextField label={t('Interior', 'Interior')} value={formData.interior} onChange={handleChange('interior')} fullWidth />
                <TextField label={t('Lote', 'Lot')} value={formData.lote} onChange={handleChange('lote')} fullWidth />
                <TextField label={t('Dpto', 'Apt')} value={formData.dpto} onChange={handleChange('dpto')} fullWidth />
                <TextField label={t('Manzana', 'Block')} value={formData.manzana} onChange={handleChange('manzana')} fullWidth />
                <TextField label={t('Kilómetro', 'Km')} value={formData.kilometro} onChange={handleChange('kilometro')} fullWidth />
                <TextField label={t('Tipo', 'Type')} value={formData.tipo} onChange={handleChange('tipo')} fullWidth />
                <TextField
                  label={t('Actividad económica', 'Economic activity')}
                  value={formData.actividadEconomica}
                  onChange={handleChange('actividadEconomica')}
                  fullWidth
                />
                <TextField
                  label={t('N° trabajadores', 'Workers')}
                  value={formData.numeroTrabajadores}
                  onChange={handleChange('numeroTrabajadores')}
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                />
                <TextField
                  label={t('Tipo facturación', 'Billing type')}
                  value={formData.tipoFacturacion}
                  onChange={handleChange('tipoFacturacion')}
                  fullWidth
                />
                <TextField
                  label={t('Tipo contabilidad', 'Accounting type')}
                  value={formData.tipoContabilidad}
                  onChange={handleChange('tipoContabilidad')}
                  fullWidth
                />
                <TextField
                  label={t('Comercio exterior', 'Foreign trade')}
                  value={formData.comercioExterior}
                  onChange={handleChange('comercioExterior')}
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.esAgenteRetencion}
                      onChange={(_e, checked) => setFormData((prev) => ({ ...prev, esAgenteRetencion: checked }))}
                    />
                  }
                  label={t('Agente de retención', 'Withholding agent')}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.esBuenContribuyente}
                      onChange={(_e, checked) => setFormData((prev) => ({ ...prev, esBuenContribuyente: checked }))}
                    />
                  }
                  label={t('Buen contribuyente', 'Good taxpayer')}
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {lookupError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {lookupError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading || lookupLoading}>
            {t('Cancelar', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || lookupLoading || !isRucValid || !formData.razonSocial.trim() || telefonoError}
          >
            {loading ? t('Guardando...', 'Saving...') : proveedor ? t('Actualizar', 'Update') : t('Crear', 'Create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProveedorForm;
