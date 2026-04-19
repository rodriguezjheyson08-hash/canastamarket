import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  IconButton,
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
  Tooltip,
  Typography
} from '@mui/material';
import { Add, Delete, Download, Edit, Refresh } from '@mui/icons-material';
import { PedidoCompra, Proveedor } from '../types';
import { useI18n } from '../hooks/useI18n';
import ProveedorForm from '../components/forms/ProveedorForm';
import {
  createProveedor,
  deletePedidoCompra,
  deletePedidosCompraByIds,
  deleteProveedor,
  getPedidoCompra,
  getProveedores,
  listPedidosCompra,
  updateProveedor
} from '../services/proveedores';
import { loadBoletaConfig } from '../utils/boletaConfig';
import { generatePedidoCompraPdf } from '../utils/pedidoCompraPdf';
import { useAuth } from '../contexts/AuthContext';

const WHATSAPP_ICON = `${process.env.PUBLIC_URL}/images/logowats.png`;
const GMAIL_ICON = `${process.env.PUBLIC_URL}/images/logoGmail.png`;

const normalizePhoneForWhatsApp = (raw?: string | null) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return `51${digits}`; // Perú
  if (digits.length === 10 && digits.startsWith('0')) return `51${digits.slice(1)}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return digits;
};

const buildWhatsAppUrl = (proveedor: Proveedor) => {
  const phone = normalizePhoneForWhatsApp(proveedor.contactoTelefono);
  if (!phone) return '';
  const message = `Hola ${proveedor.razonSocial || ''}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const buildGmailUrl = (proveedor: Proveedor) => {
  const to = String(proveedor.contactoEmail || '').trim();
  if (!to) return '';
  const subject = `Pedido / consulta - ${proveedor.razonSocial || 'Proveedor'}`;
  const body = `Hola ${proveedor.contactoNombre || proveedor.razonSocial || ''},\n\n`;
  // Única forma confiable de prellenar destinatario/asunto/cuerpo en Gmail vía URL.
  // (El modo "#inbox?compose=new" suele ignorar to/su/body y abre vacío.)
  return `https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&source=mailto&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const formatDateTime = (raw: any) => {
  const date = raw ? new Date(raw) : null;
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PE');
};

const ProveedoresPage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresLoading, setProveedoresLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
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

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchProveedores = async () => {
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

  const fetchPedidos = async () => {
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
  };

  useEffect(() => {
    void fetchProveedores();
  }, []);

  useEffect(() => {
    if (tab !== 1) return;
    void fetchPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleCreate = () => {
    setEditingProveedor(undefined);
    setFormOpen(true);
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormOpen(true);
  };

  const handleDelete = async (proveedor: Proveedor) => {
    const ok = window.confirm(
      `${t('¿Eliminar proveedor?', 'Delete supplier?')}\n${proveedor.razonSocial} (${proveedor.numeroDocumento})`
    );
    if (!ok) return;
    try {
      await deleteProveedor(proveedor.id);
      setProveedores((prev) => prev.filter((p) => p.id !== proveedor.id));
      showSnackbar(t('Proveedor eliminado', 'Supplier deleted'), 'success');
    } catch {
      showSnackbar(t('Error al eliminar proveedor', 'Error deleting supplier'), 'error');
    }
  };

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
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '').trim();
      showSnackbar(message || t('Error al guardar proveedor', 'Error saving supplier'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPedido = async (pedido: PedidoCompra) => {
    try {
      const full = await getPedidoCompra(pedido.id);
      await generatePedidoCompraPdf(full, loadBoletaConfig(), user);
      showSnackbar(t('PDF descargado', 'PDF downloaded'), 'success');
    } catch {
      showSnackbar(t('No se pudo generar el PDF', 'Could not generate PDF'), 'error');
    }
  };

  const togglePedidoSelection = (pedidoId: number) => {
    setSelectedPedidoIds((prev) =>
      prev.includes(pedidoId) ? prev.filter((id) => id !== pedidoId) : [...prev, pedidoId]
    );
  };

  const handleSelectAllPedidos = (checked: boolean) => {
    if (checked) {
      setSelectedPedidoIds(pedidos.map((p) => p.id));
      return;
    }
    setSelectedPedidoIds([]);
  };

  const handleDeletePedido = async (pedido: PedidoCompra) => {
    const ok = window.confirm(
      `${t('¿Eliminar pedido de compra?', 'Delete purchase order?')}\n#${pedido.id} - ${pedido.proveedor?.razonSocial || ''}`
    );
    if (!ok) return;
    try {
      await deletePedidoCompra(pedido.id);
      setPedidos((prev) => prev.filter((item) => item.id !== pedido.id));
      setSelectedPedidoIds((prev) => prev.filter((id) => id !== pedido.id));
      showSnackbar(t('Pedido de compra eliminado', 'Purchase order deleted'), 'success');
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '').trim();
      showSnackbar(message || t('No se pudo eliminar el pedido de compra', 'Could not delete purchase order'), 'error');
    }
  };

  const handleDeleteSelectedPedidos = async () => {
    if (selectedPedidoIds.length === 0) return;
    const ok = window.confirm(
      t(
        `¿Eliminar ${selectedPedidoIds.length} pedido(s) de compra seleccionados?`,
        `Delete ${selectedPedidoIds.length} selected purchase order(s)?`
      )
    );
    if (!ok) return;
    try {
      await deletePedidosCompraByIds(selectedPedidoIds);
      setPedidos((prev) => prev.filter((item) => !selectedPedidoIds.includes(item.id)));
      setSelectedPedidoIds([]);
      showSnackbar(t('Pedidos de compra eliminados', 'Purchase orders deleted'), 'success');
    } catch (err: any) {
      const message = String(err?.response?.data?.message || err?.message || '').trim();
      showSnackbar(message || t('No se pudieron eliminar los pedidos seleccionados', 'Could not delete selected orders'), 'error');
    }
  };

  const allPedidosSelected = pedidos.length > 0 && selectedPedidoIds.length === pedidos.length;
  const somePedidosSelected = selectedPedidoIds.length > 0 && selectedPedidoIds.length < pedidos.length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1">
          {t('Proveedores', 'Suppliers')}
        </Typography>
        <Box display="flex" gap={1}>
          {tab === 0 ? (
            <>
              <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
                {t('Nuevo', 'New')}
              </Button>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchProveedores} disabled={proveedoresLoading}>
                {t('Actualizar', 'Refresh')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeleteSelectedPedidos}
                disabled={pedidosLoading || selectedPedidoIds.length === 0}
              >
                {t('Eliminar seleccionados', 'Delete selected')}
              </Button>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchPedidos} disabled={pedidosLoading}>
                {t('Actualizar', 'Refresh')}
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable">
          <Tab label={t('Lista', 'List')} />
          <Tab label={t('Pedidos de compra', 'Purchase orders')} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <>
          {proveedoresLoading ? null : proveedores.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('No hay proveedores registrados', 'No suppliers registered')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('Agrega tu primer proveedor', 'Add your first supplier')}
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
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
                  {proveedores.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.numeroDocumento}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {p.razonSocial}
                        </Typography>
                        {p.estado && (
                          <Typography variant="caption" color="text.secondary">
                            {p.estado}
                            {p.condicion ? ` • ${p.condicion}` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{p.contactoNombre || '-'}</TableCell>
                      <TableCell>{p.contactoTelefono || '-'}</TableCell>
                      <TableCell>{p.direccion || '-'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="WhatsApp">
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              sx={{ p: 0.75, mx: 0.25 }}
                              onClick={() => {
                                const url = buildWhatsAppUrl(p);
                                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              disabled={!normalizePhoneForWhatsApp(p.contactoTelefono)}
                            >
                              <img src={WHATSAPP_ICON} alt="WhatsApp" style={{ width: 22, height: 22 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Gmail">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              sx={{ p: 0.75, mx: 0.25 }}
                              onClick={() => {
                                const url = buildGmailUrl(p);
                                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              disabled={!String(p.contactoEmail || '').trim()}
                            >
                              <img src={GMAIL_ICON} alt="Gmail" style={{ width: 22, height: 22 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleEdit(p)} color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(p)} color="error">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          {pedidosLoading ? null : pedidos.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('No hay pedidos de compra registrados', 'No purchase orders registered')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('Crea pedidos desde Productos', 'Create orders from Products')}
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
                        onChange={(e) => handleSelectAllPedidos(e.target.checked)}
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
                  {pedidos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedPedidoIds.includes(p.id)}
                          onChange={() => togglePedidoSelection(p.id)}
                          inputProps={{ 'aria-label': `Seleccionar pedido ${p.id}` }}
                        />
                      </TableCell>
                      <TableCell>#{p.id}</TableCell>
                      <TableCell>{formatDateTime(p.fecha)}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {p.proveedor?.razonSocial}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.proveedor?.numeroDocumento}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{p.itemsCount ?? '-'}</TableCell>
                      <TableCell align="right">{p.totalCantidad ?? '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleDownloadPedido(p)} aria-label="download">
                          <Download />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => void handleDeletePedido(p)} aria-label="delete">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
	          <Box mt={2}>
	            <Alert severity="info">
	              {t(
	                'Tip: arma el pedido desde Productos y luego descárgalo en PDF para enviarlo al proveedor.',
	                'Tip: build the order from Products and download it as PDF to send to the supplier.'
	              )}
	            </Alert>
	          </Box>
	        </>
	      )}

      <ProveedorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        proveedor={editingProveedor}
        loading={saving}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProveedoresPage;
