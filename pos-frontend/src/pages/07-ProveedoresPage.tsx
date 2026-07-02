/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/07-ProveedoresPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { Add, Clear, Delete, Download, Edit, Refresh, Search } from '@mui/icons-material';
import { PedidoCompra, Proveedor } from '../types';
import { useI18n } from '../hooks/useI18n';
import ProveedorForm from '../components/forms/ProveedorForm';
import {
  createProveedor,
  deletePedidoCompra,
  deletePedidosCompraByIds,
  deleteProveedor,
  downloadPedidoCompraPdf,
  getProveedores,
  listPedidosCompra,
  updateProveedor
} from '../services/proveedores';
import {
  pedidosInfoBoxStyles,
  proveedorContactIconButtonStyles,
  proveedorContactIconImageStyles,
  proveedoresEmptyStateStyles,
  proveedoresHeaderActionsStyles,
  proveedoresHeaderStyles,
  proveedoresPageContainerStyles,
  proveedoresSearchPaperStyles,
  proveedoresTabsPaperStyles
} from '../features/proveedores/styles';

// LOGICA: prepara el telefono del proveedor para abrir WhatsApp con codigo de Peru.
const normalizePhoneForWhatsApp = (raw?: string | null) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return `51${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `51${digits.slice(1)}`;
  return digits;
};

// LOGICA: arma una ventana de redaccion de Gmail con el correo del proveedor como destinatario.
const buildGmailComposeUrl = (email: string, razonSocial?: string | null) => {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email,
    su: `Pedido / consulta - ${razonSocial || 'Proveedor'}`
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
};

// DISENO: rutas de las imagenes usadas como iconos en los botones WhatsApp y Gmail.
const CONTACT_ICONS = {
  whatsapp: `${process.env.PUBLIC_URL}/images/whatsapp.svg`,
  gmail: `${process.env.PUBLIC_URL}/images/gmail.svg`
};

// DISENO: boton visual reusable para mostrar iconos con imagen dentro de "Acciones".
const ContactImageButton: React.FC<{
  title: string;
  src: string;
  disabled: boolean;
  onClick: () => void;
}> = ({ title, src, disabled, onClick }) => (
  <Tooltip title={title}>
    <span>
      <IconButton size="small" disabled={disabled} onClick={onClick} sx={proveedorContactIconButtonStyles}>
        <Box
          component="img"
          src={src}
          alt={title}
          sx={proveedorContactIconImageStyles(disabled)}
        />
      </IconButton>
    </span>
  </Tooltip>
);

// LOGICA: format Date Time concentra una operacion de este archivo.
const formatDateTime = (raw: any) => {
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PE');
};

// LOGICA: download Blob concentra una operacion de este archivo.
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ProveedoresPage: React.FC = () => {
  const { t } = useI18n();
  // LOGICA: guarda que pestana esta activa: 0 = Lista, 1 = Pedidos de compra.
  const [tab, setTab] = useState(0);
  // LOGICA: lista de proveedores que llega del backend.
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  // LOGICA: texto escrito dentro del espacio/buscador de proveedores.
  const [proveedorSearch, setProveedorSearch] = useState('');
  // LOGICA: controla si la lista de proveedores esta cargando.
  const [proveedoresLoading, setProveedoresLoading] = useState(true);
  // LOGICA: abre o cierra el modal/formulario de proveedor.
  const [formOpen, setFormOpen] = useState(false);
  // LOGICA: guarda el proveedor que se esta editando; undefined significa nuevo.
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | undefined>();
  const [saving, setSaving] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [selectedPedidoIds, setSelectedPedidoIds] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // LOGICA: funcion del boton "Actualizar"; trae proveedores desde el backend.
  const fetchProveedores = useCallback(async () => {
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
  }, [showSnackbar, t]);

  // LOGICA: trae los pedidos de compra cuando se entra a la pestana correspondiente.
  const fetchPedidos = useCallback(async () => {
    setPedidosLoading(true);
    try {
      const data = await listPedidosCompra();
      setPedidos(Array.isArray(data) ? data : []);
      setSelectedPedidoIds([]);
    } catch {
      setPedidos([]);
      setSelectedPedidoIds([]);
      showSnackbar(t('Error al cargar pedidos de compra', 'Error loading purchase orders'), 'error');
    } finally {
      setPedidosLoading(false);
    }
  }, [showSnackbar, t]);

  useEffect(() => {
    void fetchProveedores();
  }, [fetchProveedores]);

  useEffect(() => {
    if (tab === 1) void fetchPedidos();
  }, [fetchPedidos, tab]);

  // LOGICA: guarda el formulario; si hay proveedor seleccionado actualiza, si no crea.
  const handleSubmit = async (payload: Partial<Proveedor>) => {
    setSaving(true);
    try {
      if (editingProveedor) {
        const updated = await updateProveedor(editingProveedor.id, payload);
        setProveedores((prev) => prev.map((p) => (p.id === editingProveedor.id ? updated : p)));
        showSnackbar(t('Proveedor actualizado', 'Supplier updated'), 'success');
      } else {
        const created = await createProveedor(payload);
        setProveedores((prev) => [...prev, created]);
        showSnackbar(t('Proveedor creado', 'Supplier created'), 'success');
      }
      setFormOpen(false);
    } catch (error: any) {
      const message = String(error?.response?.data?.message || error?.message || '').trim();
      showSnackbar(message || t('Error al guardar proveedor', 'Error saving supplier'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // LOGICA: funcion del icono basurero; confirma y elimina un proveedor.
  const handleDeleteProveedor = async (proveedor: Proveedor) => {
    const ok = window.confirm(`${t('¿Eliminar proveedor?', 'Delete supplier?')}\n${proveedor.razonSocial} (${proveedor.numeroDocumento})`);
    if (!ok) return;
    try {
      await deleteProveedor(proveedor.id);
      setProveedores((prev) => prev.filter((p) => p.id !== proveedor.id));
      showSnackbar(t('Proveedor eliminado', 'Supplier deleted'), 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || t('Error al eliminar proveedor', 'Error deleting supplier'), 'error');
    }
  };

// LOGICA PEDIDOS - PDF:
// Descarga la orden de compra en PDF para enviar al proveedor.
  const handleDownloadPdf = async (pedido: PedidoCompra) => {
    try {
      const blob = await downloadPedidoCompraPdf(pedido.id);
      downloadBlob(blob, `orden_compra_${pedido.id}.pdf`);
      showSnackbar(t('PDF descargado', 'PDF downloaded'), 'success');
    } catch {
      showSnackbar(t('No se pudo descargar el PDF', 'Could not download PDF'), 'error');
    }
  };

// LOGICA: handle Delete Pedido concentra una operacion de este archivo.
  const handleDeletePedido = async (pedido: PedidoCompra) => {
    const ok = window.confirm(`${t('¿Eliminar pedido de compra?', 'Delete purchase order?')}\n#${pedido.id} - ${pedido.proveedor?.razonSocial || ''}`);
    if (!ok) return;
    try {
      await deletePedidoCompra(pedido.id);
      setPedidos((prev) => prev.filter((item) => item.id !== pedido.id));
      setSelectedPedidoIds((prev) => prev.filter((id) => id !== pedido.id));
      showSnackbar(t('Pedido de compra eliminado', 'Purchase order deleted'), 'success');
    } catch {
      showSnackbar(t('No se pudo eliminar el pedido de compra', 'Could not delete purchase order'), 'error');
    }
  };

// LOGICA: handle Delete Selected Pedidos concentra una operacion de este archivo.
  const handleDeleteSelectedPedidos = async () => {
    if (selectedPedidoIds.length === 0) return;
    const ok = window.confirm(t(`¿Eliminar ${selectedPedidoIds.length} pedido(s) de compra seleccionados?`, `Delete ${selectedPedidoIds.length} selected purchase order(s)?`));
    if (!ok) return;
    try {
      await deletePedidosCompraByIds(selectedPedidoIds);
      setPedidos((prev) => prev.filter((item) => !selectedPedidoIds.includes(item.id)));
      setSelectedPedidoIds([]);
      showSnackbar(t('Pedidos de compra eliminados', 'Purchase orders deleted'), 'success');
    } catch {
      showSnackbar(t('No se pudieron eliminar los pedidos seleccionados', 'Could not delete selected orders'), 'error');
    }
  };

  const allPedidosSelected = pedidos.length > 0 && selectedPedidoIds.length === pedidos.length;
  const somePedidosSelected = selectedPedidoIds.length > 0 && selectedPedidoIds.length < pedidos.length;
  // LOGICA: filtro de la busqueda; revisa RUC, razon social, contacto, telefono, email,
  // direccion y datos SUNAT para decidir que filas se muestran en la tabla.
  const filteredProveedores = useMemo(() => {
    const query = proveedorSearch.trim().toLowerCase();
    if (!query) return proveedores;

    return proveedores.filter((proveedor) => {
      const searchable = [
        proveedor.numeroDocumento,
        proveedor.razonSocial,
        proveedor.contactoNombre,
        proveedor.contactoTelefono,
        proveedor.contactoEmail,
        proveedor.direccion,
        proveedor.estado,
        proveedor.condicion,
        proveedor.distrito,
        proveedor.provincia,
        proveedor.departamento
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [proveedorSearch, proveedores]);

  return (
    <Container maxWidth="xl" sx={proveedoresPageContainerStyles}>
      {/* DISENO: encabezado de la pantalla, contiene titulo "Proveedores" y botones superiores. */}
      <Box sx={proveedoresHeaderStyles}>
        <Typography variant="h4" component="h1">
          {t('Proveedores', 'Suppliers')}
        </Typography>
        <Box sx={proveedoresHeaderActionsStyles}>
          {tab === 0 ? (
            <>
              {/* DISENO: boton azul "+ Nuevo" con icono de suma. LOGICA: abre el formulario limpio. */}
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setEditingProveedor(undefined);
                  setFormOpen(true);
                }}
              >
                {t('Nuevo', 'New')}
              </Button>
              {/* DISENO: boton "Actualizar" con icono de recarga. LOGICA: ejecuta fetchProveedores. */}
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchProveedores} disabled={proveedoresLoading}>
                {t('Actualizar', 'Refresh')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" color="error" startIcon={<Delete />} onClick={handleDeleteSelectedPedidos} disabled={pedidosLoading || selectedPedidoIds.length === 0}>
                {t('Eliminar seleccionados', 'Delete selected')}
              </Button>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchPedidos} disabled={pedidosLoading}>
                {t('Actualizar', 'Refresh')}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* DISENO: pestanas "Lista" y "Pedidos de compra". LOGICA: setTab cambia el contenido visible. */}
      <Paper sx={proveedoresTabsPaperStyles}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable">
          <Tab label={t('Lista', 'List')} />
          <Tab label={t('Pedidos de compra', 'Purchase orders')} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        proveedoresLoading ? null : proveedores.length === 0 ? (
          <Paper sx={proveedoresEmptyStateStyles}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('No hay proveedores registrados', 'No suppliers registered')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Agrega tu primer proveedor', 'Add your first supplier')}
            </Typography>
          </Paper>
        ) : (
          <>
            {/* DISENO: espacio/barra para buscar proveedores. LOGICA: proveedorSearch guarda lo escrito. */}
            <Paper sx={proveedoresSearchPaperStyles}>
              <TextField
                fullWidth
                size="small"
                value={proveedorSearch}
                onChange={(event) => setProveedorSearch(event.target.value)}
                placeholder={t('Buscar por RUC, razón social, contacto, teléfono o dirección', 'Search by RUC, business name, contact, phone or address')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {/* DISENO: icono de lupa al inicio del buscador. */}
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: proveedorSearch ? (
                    <InputAdornment position="end">
                      {/* DISENO: icono X. LOGICA: limpia el texto de busqueda con setProveedorSearch(''). */}
                      <IconButton size="small" aria-label="Limpiar búsqueda" onClick={() => setProveedorSearch('')}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }}
              />
            </Paper>

            {filteredProveedores.length === 0 ? (
              <Paper sx={proveedoresEmptyStateStyles}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('No se encontraron proveedores', 'No suppliers found')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Prueba con otro RUC, nombre o contacto.', 'Try another RUC, name or contact.')}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                {/* DISENO: tabla principal de proveedores con columnas RUC, razon social, contacto, telefono, direccion y acciones. */}
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('RUC', 'RUC')}</TableCell>
                      <TableCell>{t('Razón social', 'Business name')}</TableCell>
                      <TableCell>{t('Contacto', 'Contact')}</TableCell>
                      <TableCell>{t('Teléfono', 'Phone')}</TableCell>
                      <TableCell>{t('Dirección', 'Address')}</TableCell>
                      <TableCell align="center">{t('Acciones', 'Actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProveedores.map((proveedor) => {
                      const whatsappPhone = normalizePhoneForWhatsApp(proveedor.contactoTelefono);
                      const email = String(proveedor.contactoEmail || '').trim();
                      return (
                        <TableRow key={proveedor.id}>
                          <TableCell>{proveedor.numeroDocumento}</TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {proveedor.razonSocial}
                            </Typography>
                            {(proveedor.estado || proveedor.condicion) && (
                              <Typography variant="caption" color="text.secondary">
                                {proveedor.estado || ''}
                                {proveedor.condicion ? ` - ${proveedor.condicion}` : ''}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{proveedor.contactoNombre || '-'}</TableCell>
                          <TableCell>{proveedor.contactoTelefono || '-'}</TableCell>
                          <TableCell>{proveedor.direccion || '-'}</TableCell>
                          {/* DISENO: columna de iconos de acciones. LOGICA: cada icono ejecuta una accion del proveedor. */}
                          <TableCell align="center">
                            <ContactImageButton
                              title="WhatsApp"
                              src={CONTACT_ICONS.whatsapp}
                              disabled={!whatsappPhone}
                              onClick={() => window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola ${proveedor.razonSocial || ''}.`)}`, '_blank', 'noopener,noreferrer')}
                            />
                            <ContactImageButton
                              title="Gmail"
                              src={CONTACT_ICONS.gmail}
                              disabled={!email}
                              onClick={() => window.open(buildGmailComposeUrl(email, proveedor.razonSocial), '_blank', 'noopener,noreferrer,width=900,height=700')}
                            />
                            {/* DISENO: icono lapiz. LOGICA: guarda este proveedor y abre el formulario en modo editar. */}
                            <IconButton size="small" color="primary" onClick={() => { setEditingProveedor(proveedor); setFormOpen(true); }}>
                              <Edit />
                            </IconButton>
                            {/* DISENO: icono basurero. LOGICA: llama handleDeleteProveedor para confirmar y eliminar. */}
                            <IconButton size="small" color="error" onClick={() => handleDeleteProveedor(proveedor)}>
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )
      )}

      {/* DISENO: contenido de la pestana "Pedidos de compra". LOGICA: se muestra solo cuando tab === 1. */}
      {tab === 1 && (
        <>
          {pedidosLoading ? null : pedidos.length === 0 ? (
            <Paper sx={proveedoresEmptyStateStyles}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('No hay pedidos de compra registrados', 'No purchase orders registered')}
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allPedidosSelected}
                        indeterminate={somePedidosSelected}
                        onChange={(event) => setSelectedPedidoIds(event.target.checked ? pedidos.map((p) => p.id) : [])}
                        inputProps={{ 'aria-label': 'Seleccionar pedidos' }}
                      />
                    </TableCell>
                    <TableCell>{t('ID', 'ID')}</TableCell>
                    <TableCell>{t('Fecha', 'Date')}</TableCell>
                    <TableCell>{t('Proveedor', 'Supplier')}</TableCell>
                    <TableCell align="right">{t('Items', 'Items')}</TableCell>
                    <TableCell align="right">{t('Cantidad', 'Quantity')}</TableCell>
                    <TableCell align="center">{t('Acciones', 'Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedPedidoIds.includes(pedido.id)}
                          onChange={() => setSelectedPedidoIds((prev) => prev.includes(pedido.id) ? prev.filter((id) => id !== pedido.id) : [...prev, pedido.id])}
                          inputProps={{ 'aria-label': `Seleccionar pedido ${pedido.id}` }}
                        />
                      </TableCell>
                      <TableCell>#{pedido.id}</TableCell>
                      <TableCell>{formatDateTime(pedido.fecha)}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {pedido.proveedor?.razonSocial}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pedido.proveedor?.numeroDocumento}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{pedido.itemsCount ?? '-'}</TableCell>
                      <TableCell align="right">{pedido.totalCantidad ?? '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleDownloadPdf(pedido)} aria-label="download">
                          <Download />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeletePedido(pedido)} aria-label="delete">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box sx={pedidosInfoBoxStyles}>
            <Alert severity="info">
              {t('Los pedidos de compra se pueden descargar en PDF para enviarlos al proveedor.', 'Purchase orders can be downloaded as PDF to send to the supplier.')}
            </Alert>
          </Box>
        </>
      )}

      {/* DISENO: modal/formulario de proveedor. LOGICA: usa formOpen, editingProveedor y handleSubmit. */}
      <ProveedorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        proveedor={editingProveedor}
        loading={saving}
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProveedoresPage;
