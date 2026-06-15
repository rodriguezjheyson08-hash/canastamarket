import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  InputAdornment,
  Alert,
  Collapse,
  Checkbox,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  Person,
  Security,
  Settings,
  Info,
  Logout,
  Group,
  Edit,
  Delete,
  LockOpen,
  Block,
  Visibility,
  VisibilityOff,
  Search
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '@mui/material/Avatar';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  unlockUsuario,
  getPersonaPorDni,
  UsuarioItem,
  saveConfiguracionSistema
} from '../services/api';
import {
  BoletaConfig,
  loadBoletaConfig,
  saveBoletaConfig
} from '../utils/boletaConfig';
import { AppConfig, saveAppConfig } from '../utils/appConfig';
import { PermissionKey, UserPermissions } from '../types';
import {
  DEFAULT_CAJERO_PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  normalizePermissions
} from '../utils/permissions';
import { loadUserPermissionsMap, setUserPermissionsForId } from '../utils/userPermissionsMap';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';
import { useTiendaConfig } from '../hooks/useTiendaConfig';

interface UserFormState {
  nombreUsuario: string;
  nombreCompleto: string;
  rol: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR';
  password: string;
  telefono: string;
  email: string;
  motoMatricula: string;
  repartidorEstado: 'libre' | 'ocupado' | 'inactivo';
}

type UserFormTextField = keyof UserFormState;

const createDefaultUserForm = (): UserFormState => ({
  nombreUsuario: '',
  nombreCompleto: '',
  rol: 'CAJERO',
  password: '',
  telefono: '',
  email: '',
  motoMatricula: '',
  repartidorEstado: 'libre'
});

const ConfiguracionPage: React.FC = () => {
  const { user, logout, loading, updateUser } = useAuth();
  const savedConfig = useAppConfig();
  const tiendaState = useTiendaConfig();
  const { t, idioma } = useI18n();

  // Estado para configuración personalizada
  const [config, setConfig] = useState<AppConfig>(savedConfig);

  const [toastMsg, setToastMsg] = useState('');
  const [configError, setConfigError] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuariosError, setUsuariosError] = useState('');
  const [usuariosMsg, setUsuariosMsg] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [quickPermUserId, setQuickPermUserId] = useState<number | ''>('');
  const [quickPermisos, setQuickPermisos] = useState<UserPermissions>({ ...DEFAULT_CAJERO_PERMISSIONS });
  const [savingQuickPermisos, setSavingQuickPermisos] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>(createDefaultUserForm());
  const [perfilForm, setPerfilForm] = useState({
    dni: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
    fotoUrl: '',
    password: ''
  });
  const [perfilMsg, setPerfilMsg] = useState('');
  const [perfilError, setPerfilError] = useState('');
  const [perfilDniLoading, setPerfilDniLoading] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(true);
  const [showPerfilPassword, setShowPerfilPassword] = useState(true);
  const [customOpen, setCustomOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [boletaOpen, setBoletaOpen] = useState(false);
  const [usuariosOpen, setUsuariosOpen] = useState(false);
  const [boletaConfig, setBoletaConfig] = useState<BoletaConfig>(() => loadBoletaConfig());
  const [boletaError, setBoletaError] = useState('');

  const [tiendaForm, setTiendaForm] = useState({
    tiendaDireccion: '',
    tiendaLat: '',
    tiendaLng: '',
    contactEmail: '',
    contactWhatsapp: '',
    deliveryEnabled: true,
    deliveryBase: '3',
    deliveryPerKm: '1.2',
    deliveryIncludedKm: '1',
    deliveryMinFee: '4',
    deliverySmallOrderThreshold: '30',
    deliverySmallOrderFee: '2',
    deliveryMaxKm: '8'
  });
  const [tiendaSaving, setTiendaSaving] = useState(false);
  const [tiendaGeoLoading, setTiendaGeoLoading] = useState(false);

  useEffect(() => {
    setConfig(savedConfig);
  }, [savedConfig]);

  useEffect(() => {
    setBoletaConfig(loadBoletaConfig());
  }, []);

  useEffect(() => {
    if (user) {
      setPerfilForm({
        dni: user.dni || '',
        nombreCompleto: user.nombreCompleto || '',
        telefono: user.telefono || '',
        email: user.email || '',
        fotoUrl: user.fotoUrl || '',
        password: ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!tiendaState.config) return;
    setTiendaForm({
      tiendaDireccion: tiendaState.config.tiendaDireccion || '',
      tiendaLat: tiendaState.config.tiendaLat !== null && tiendaState.config.tiendaLat !== undefined ? String(tiendaState.config.tiendaLat) : '',
      tiendaLng: tiendaState.config.tiendaLng !== null && tiendaState.config.tiendaLng !== undefined ? String(tiendaState.config.tiendaLng) : '',
      contactEmail: String(tiendaState.config.contactEmail || user?.email || ''),
      contactWhatsapp: String(tiendaState.config.contactWhatsapp || user?.telefono || ''),
      deliveryEnabled: Boolean(tiendaState.config.deliveryEnabled),
      deliveryBase: String(tiendaState.config.deliveryBase ?? 3),
      deliveryPerKm: String(tiendaState.config.deliveryPerKm ?? 1.2),
      deliveryIncludedKm: String(tiendaState.config.deliveryIncludedKm ?? 1),
      deliveryMinFee: String(tiendaState.config.deliveryMinFee ?? 4),
      deliverySmallOrderThreshold: String(tiendaState.config.deliverySmallOrderThreshold ?? 30),
      deliverySmallOrderFee: String(tiendaState.config.deliverySmallOrderFee ?? 2),
      deliveryMaxKm: String(tiendaState.config.deliveryMaxKm ?? 8)
    });
  }, [tiendaState.config, user?.email, user?.telefono]);

  useEffect(() => {
    if (!loading && user?.rol === 'ADMINISTRADOR') {
      loadUsuarios();
    }
  }, [user, loading]);

  const loadUsuarios = async () => {
    setUsuariosLoading(true);
    setUsuariosError('');
    try {
      const data = await getUsuarios();
      const localPermissionsMap = loadUserPermissionsMap();
      const mergedData = data.map((u) => ({
        ...u,
        permisos: localPermissionsMap[String(u.id)] || u.permisos || null
      }));
      setUsuarios(mergedData);
      if (mergedData.length === 0) {
        setQuickPermUserId('');
        setQuickPermisos({ ...DEFAULT_CAJERO_PERMISSIONS });
      } else {
        const selected = mergedData.find((u) => u.id === Number(quickPermUserId));
        const fallback = mergedData.find((u) => u.rol === 'CAJERO') || mergedData[0];
        const target = selected || fallback;
        setQuickPermUserId(target.id);
        setQuickPermisos(normalizePermissions(target.rol, target.permisos || null));
      }
    } catch {
      setUsuariosError('No se pudieron cargar los usuarios.');
    } finally {
      setUsuariosLoading(false);
    }
  };

  const handleUserFormChange = (field: UserFormTextField, value: string) => {
    if (field === 'telefono') {
      const phoneValue = value.replace(/\D/g, '').slice(0, 9);
      setUserForm(prev => ({ ...prev, telefono: phoneValue }));
      return;
    }
    if (field === 'rol') {
      setUserForm(prev => ({ ...prev, rol: value as 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR' }));
      return;
    }
    if (field === 'repartidorEstado') {
      setUserForm(prev => ({ ...prev, repartidorEstado: value as 'libre' | 'ocupado' | 'inactivo' }));
      return;
    }
    setUserForm(prev => ({ ...prev, [field]: value }));
  };

  const resetUserForm = () => {
    setUserForm(createDefaultUserForm());
    setEditingUserId(null);
  };

  const handleQuickUserChange = (usuarioId: number) => {
    setQuickPermUserId(usuarioId);
    const selected = usuarios.find((u) => u.id === usuarioId);
    if (!selected) return;
    setQuickPermisos(normalizePermissions(selected.rol, selected.permisos || null));
  };

  const handleQuickPermisoToggle = (permiso: PermissionKey, enabled: boolean) => {
    setQuickPermisos((prev) => ({
      ...prev,
      [permiso]: enabled
    }));
  };

  const handlePerfilChange = (field: string, value: string) => {
    if (field === 'telefono') {
      const phoneValue = value.replace(/\D/g, '').slice(0, 9);
      setPerfilForm(prev => ({ ...prev, telefono: phoneValue }));
      return;
    }
    if (field === 'dni') {
      const dniValue = value.replace(/\D/g, '').slice(0, 8);
      setPerfilForm(prev => ({ ...prev, dni: dniValue }));
      return;
    }
    setPerfilForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePerfilDniLookup = async () => {
    const dni = String((perfilForm as any).dni || '').trim();
    if (!/^\d{8}$/.test(dni)) {
      setPerfilError('El DNI debe tener 8 dígitos.');
      return;
    }
    setPerfilError('');
    setPerfilDniLoading(true);
    try {
      const data = await getPersonaPorDni(dni);
      const nombreCompleto = String(data?.nombreCompleto || '').trim();
      if (nombreCompleto) {
        setPerfilForm((prev: any) => ({ ...prev, nombreCompleto }));
      }
    } catch (error: any) {
      setPerfilError(error?.response?.data?.message || 'No se pudo consultar el DNI.');
    } finally {
      setPerfilDniLoading(false);
    }
  };

  const handlePerfilImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handlePerfilChange('fotoUrl', e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUserSubmit = async () => {
    setUsuariosError('');
    if (!userForm.nombreUsuario || !userForm.nombreCompleto || !userForm.rol) {
      setUsuariosError('Completa usuario, nombre completo y rol.');
      return;
    }
    if (userForm.telefono && !/^\d{9}$/.test(userForm.telefono)) {
      setUsuariosError('El teléfono debe tener 9 dígitos.');
      return;
    }
    if (userForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      setUsuariosError('El correo no es válido.');
      return;
    }
    if (!editingUserId && !userForm.password) {
      setUsuariosError('La contraseña es obligatoria para crear usuario.');
      return;
    }

    try {
      if (editingUserId) {
        const payload: any = {
          nombreUsuario: userForm.nombreUsuario,
          nombreCompleto: userForm.nombreCompleto,
          rol: userForm.rol,
          telefono: userForm.telefono,
          email: userForm.email,
          motoMatricula: userForm.rol === 'REPARTIDOR' ? userForm.motoMatricula : undefined,
          repartidorEstado: userForm.rol === 'REPARTIDOR' ? userForm.repartidorEstado : undefined
        };
        if (userForm.password.trim() !== '') {
          payload.password = userForm.password;
        }
        await updateUsuario(editingUserId, payload);
        setUsuariosMsg('Usuario actualizado correctamente.');
      } else {
        const created = await createUsuario({
          nombreUsuario: userForm.nombreUsuario,
          nombreCompleto: userForm.nombreCompleto,
          rol: userForm.rol as 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR',
          password: userForm.password,
          telefono: userForm.telefono,
          email: userForm.email,
          permisos: normalizePermissions(userForm.rol, null),
          motoMatricula: userForm.rol === 'REPARTIDOR' ? userForm.motoMatricula : undefined,
          repartidorEstado: userForm.rol === 'REPARTIDOR' ? userForm.repartidorEstado : undefined
        });
        setUserPermissionsForId(created.id, normalizePermissions(created.rol, created.permisos || null));
        setUsuariosMsg('Usuario creado correctamente.');
      }
      resetUserForm();
      setUsuariosOpen(false);
      await loadUsuarios();
      setTimeout(() => setUsuariosMsg(''), 2000);
    } catch (error: any) {
      setUsuariosError(error?.response?.data?.message || 'No se pudo guardar el usuario.');
    }
  };

  const handleEditUsuario = (usuario: UsuarioItem) => {
    setEditingUserId(usuario.id);
    setUserForm({
      nombreUsuario: usuario.nombre_usuario,
      nombreCompleto: usuario.nombre_completo,
      rol: usuario.rol,
      password: '',
      telefono: usuario.telefono || '',
      email: usuario.email || '',
      motoMatricula: usuario.moto_matricula || '',
      repartidorEstado: (usuario.repartidor_estado as any) || 'libre'
    });
    setQuickPermUserId(usuario.id);
    setQuickPermisos(normalizePermissions(usuario.rol, usuario.permisos || null));
  };

  const handleQuickPermisosSave = async () => {
    const selected = usuarios.find((u) => u.id === Number(quickPermUserId));
    if (!selected) {
      setUsuariosError('Selecciona un usuario para asignar permisos.');
      return;
    }
    setUsuariosError('');
    try {
      setSavingQuickPermisos(true);
      const updated = await updateUsuario(selected.id, { rol: selected.rol, permisos: quickPermisos });
      const updatedPermisos = normalizePermissions(updated.rol, updated.permisos || quickPermisos);
      setUserPermissionsForId(selected.id, updatedPermisos);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === selected.id
            ? { ...u, permisos: updatedPermisos }
            : u
        )
      );
      setQuickPermisos(updatedPermisos);
      if (updated.id === user?.id) {
        updateUser(mapUsuarioToUser(updated));
      }
      setUsuariosOpen(false);
      setUsuariosMsg(`Permisos actualizados para ${selected.nombre_usuario}.`);
      setTimeout(() => setUsuariosMsg(''), 2000);
    } catch (error: any) {
      setUsuariosError(error?.response?.data?.message || 'No se pudieron actualizar los permisos.');
    } finally {
      setSavingQuickPermisos(false);
    }
  };

  const handleDeleteUsuario = async (usuario: UsuarioItem) => {
    if (usuario.nombre_usuario === user?.nombreUsuario) {
      setUsuariosError('No puedes eliminar tu propio usuario.');
      return;
    }
    const confirmed = window.confirm(`¿Eliminar usuario ${usuario.nombre_usuario}?`);
    if (!confirmed) return;
    try {
      await deleteUsuario(usuario.id);
      await loadUsuarios();
      setUsuariosMsg('Usuario eliminado correctamente.');
      setTimeout(() => setUsuariosMsg(''), 2000);
    } catch (error: any) {
      setUsuariosError(error?.response?.data?.message || 'No se pudo eliminar el usuario.');
    }
  };

  const handleUnlockUsuario = async (usuario: UsuarioItem) => {
    try {
      await unlockUsuario(usuario.id);
      await loadUsuarios();
      setUsuariosMsg('Usuario habilitado correctamente.');
      setTimeout(() => setUsuariosMsg(''), 2000);
    } catch (error: any) {
      setUsuariosError(error?.response?.data?.message || 'No se pudo habilitar el usuario.');
    }
  };

  const handleToggleActivo = async (usuario: UsuarioItem) => {
    if (usuario.nombre_usuario === user?.nombreUsuario) {
      setUsuariosError('No puedes desactivar tu propio usuario.');
      return;
    }
    try {
      const isActive = usuario.is_active !== 0;
      await updateUsuario(usuario.id, { isActive: !isActive });
      await loadUsuarios();
      setUsuariosMsg(isActive ? 'Usuario dado de baja.' : 'Usuario habilitado.');
      setTimeout(() => setUsuariosMsg(''), 2000);
    } catch (error: any) {
      setUsuariosError(error?.response?.data?.message || 'No se pudo actualizar el estado.');
    }
  };

  const mapUsuarioToUser = (usuario: UsuarioItem) => ({
    id: usuario.id,
    nombreUsuario: usuario.nombre_usuario,
    nombreCompleto: usuario.nombre_completo,
    rol: usuario.rol,
    dni: usuario.dni || '',
    telefono: usuario.telefono || '',
    email: usuario.email || '',
    fotoUrl: usuario.foto_url || '',
    permisos: normalizePermissions(usuario.rol, usuario.permisos || null)
  });

  const handlePerfilSave = async () => {
    if (!user?.id) {
      setPerfilError('No se pudo identificar el usuario.');
      return;
    }
    if (!perfilForm.nombreCompleto) {
      setPerfilError('El nombre completo es obligatorio.');
      return;
    }
    if ((perfilForm as any).dni && !/^\d{8}$/.test(String((perfilForm as any).dni))) {
      setPerfilError('El DNI debe tener 8 dígitos.');
      return;
    }
    if (perfilForm.telefono && !/^\d{9}$/.test(perfilForm.telefono)) {
      setPerfilError('El teléfono debe tener 9 dígitos.');
      return;
    }
    if (perfilForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(perfilForm.email)) {
      setPerfilError('El correo no es válido.');
      return;
    }

    setPerfilError('');
    try {
      const payload: any = {
        dni: (perfilForm as any).dni,
        nombreCompleto: perfilForm.nombreCompleto,
        telefono: perfilForm.telefono,
        email: perfilForm.email,
        fotoUrl: perfilForm.fotoUrl
      };
      if (perfilForm.password.trim() !== '') {
        payload.password = perfilForm.password;
      }
      const updated = await updateUsuario(user.id, payload);
      updateUser(mapUsuarioToUser(updated));
      setPerfilMsg('Perfil actualizado correctamente.');
      setPerfilOpen(false);
      setTimeout(() => setPerfilMsg(''), 2000);
      setPerfilForm(prev => ({ ...prev, password: '' }));
    } catch (error: any) {
      setPerfilError(error?.response?.data?.message || 'No se pudo actualizar el perfil.');
    }
  };

  const handleConfigChange = (field: keyof AppConfig, value: string) => {
    if (configError) {
      setConfigError('');
    }
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleConfigSave = async () => {
    if (!config.appName.trim()) {
      setConfigError('El nombre de la aplicación es obligatorio.');
      return;
    }

    const savedRemote = await tiendaState.save({
      appName: config.appName.trim(),
      logo: config.logo.trim()
    });
    if (!savedRemote) {
      setConfigError(tiendaState.error || 'No se pudo guardar la personalización compartida.');
      return;
    }

    const updated = saveAppConfig(config);
    await saveConfiguracionSistema({ personalizacion: updated, boleta: boletaConfig });
    setConfig(updated);
    setConfigError('');
    setCustomOpen(false);
    setToastMsg('Guardado con éxito.');
  };

  const handleImageUpload = (field: 'logo' | 'userImg', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleConfigChange(field, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBoletaChange = (field: keyof BoletaConfig, value: string) => {
    let nextValue = value;
    if (field === 'ruc') {
      nextValue = value.replace(/\D/g, '').slice(0, 11);
    }
    if (field === 'telefono') {
      nextValue = value.replace(/\D/g, '').slice(0, 9);
    }
    if (field === 'serie') {
      nextValue = value.replace(/\D/g, '').slice(0, 3);
    }
    setBoletaConfig(prev => ({ ...prev, [field]: nextValue }));
  };

  const handleBoletaLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleBoletaChange('logo', e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toNumberOrNull = (raw: string) => {
    const v = String(raw || '').trim();
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleUseTiendaLocation = () => {
    if (!navigator.geolocation) {
      setToastMsg(t('Tu navegador no soporta geolocalización.', 'Your browser does not support geolocation.'));
      return;
    }
    setTiendaGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTiendaForm(prev => ({
          ...prev,
          tiendaLat: String(pos.coords.latitude),
          tiendaLng: String(pos.coords.longitude)
        }));
        setTiendaGeoLoading(false);
      },
      () => {
        setToastMsg(t('No se pudo obtener tu ubicación. Revisa permisos.', 'Could not get location. Check permissions.'));
        setTiendaGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveTiendaConfig = async () => {
    setTiendaSaving(true);
    const payload = {
      tiendaDireccion: tiendaForm.tiendaDireccion.trim() || null,
      tiendaLat: toNumberOrNull(tiendaForm.tiendaLat),
      tiendaLng: toNumberOrNull(tiendaForm.tiendaLng),
      contactEmail: tiendaForm.contactEmail.trim() || null,
      contactWhatsapp: tiendaForm.contactWhatsapp.trim() || null,
      deliveryEnabled: Boolean(tiendaForm.deliveryEnabled),
      deliveryBase: Number(tiendaForm.deliveryBase || 0),
      deliveryPerKm: Number(tiendaForm.deliveryPerKm || 0),
      deliveryIncludedKm: Number(tiendaForm.deliveryIncludedKm || 0),
      deliveryMinFee: Number(tiendaForm.deliveryMinFee || 0),
      deliverySmallOrderThreshold: Number(tiendaForm.deliverySmallOrderThreshold || 0),
      deliverySmallOrderFee: Number(tiendaForm.deliverySmallOrderFee || 0),
      deliveryMaxKm: Number(tiendaForm.deliveryMaxKm || 0)
    };
    const res = await tiendaState.save(payload);
    setTiendaSaving(false);
    if (res) {
      setDeliveryOpen(false);
      setToastMsg(t('Delivery actualizado.', 'Delivery settings updated.'));
    }
  };

  const handleBoletaSave = async () => {
    setBoletaError('');
    if (!boletaConfig.nombre.trim()) {
      setBoletaError('El nombre para la boleta es obligatorio.');
      return;
    }
    if (!/^\d{11}$/.test(boletaConfig.ruc)) {
      setBoletaError('El RUC debe tener 11 dígitos.');
      return;
    }
    if (boletaConfig.telefono && !/^\d{9}$/.test(boletaConfig.telefono)) {
      setBoletaError('El teléfono debe tener 9 dígitos.');
      return;
    }
    if (!/^\d{3}$/.test(boletaConfig.serie)) {
      setBoletaError('La serie debe tener 3 dígitos.');
      return;
    }

    const saved = saveBoletaConfig(boletaConfig);
    setBoletaConfig(saved);
    await saveConfiguracionSistema({ personalizacion: config, boleta: saved });
    setBoletaOpen(false);
    setToastMsg('Configuración de boleta guardada correctamente');
  };

  const handleLogout = () => {
    logout();
  };

  const quickSelectedUser = usuarios.find((u) => u.id === Number(quickPermUserId));
  const quickSelectedIsAdmin = quickSelectedUser?.rol === 'ADMINISTRADOR';
  const hasConfigChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  if (loading) return null;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('Configuración', 'Settings')}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <Person sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6">{t('Información del Usuario', 'User Information')}</Typography>
                </Box>
                <Button variant={perfilOpen ? 'contained' : 'outlined'} size="small" onClick={() => setPerfilOpen((prev) => !prev)}>
                  {perfilOpen ? t('Cerrar', 'Close') : t('Editar perfil', 'Edit profile')}
                </Button>
              </Box>

              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Avatar src={user?.fotoUrl || ''} alt={user?.nombreUsuario} sx={{ width: 88, height: 88, bgcolor: '#e0e0e0', mb: 1 }} />
              </Box>

              <List>
                <ListItem><ListItemText primary={t('Nombre de Usuario', 'Username')} secondary={user?.nombreUsuario} /></ListItem>
                <ListItem><ListItemText primary={t('DNI', 'DNI')} secondary={user?.dni || '-'} /></ListItem>
                <ListItem><ListItemText primary={t('Nombre Completo', 'Full Name')} secondary={user?.nombreCompleto || '-'} /></ListItem>
                <ListItem><ListItemText primary={t('Celular', 'Phone')} secondary={user?.telefono || '-'} /></ListItem>
                <ListItem><ListItemText primary={t('Correo', 'Email')} secondary={user?.email || '-'} /></ListItem>
                <ListItem>
                  <ListItemText
                    primary={t('Rol', 'Role')}
                    secondary={<span><Chip label={user?.rol || '-'} color={user?.rol === 'ADMINISTRADOR' ? 'primary' : 'default'} size="small" /></span>}
                  />
                </ListItem>
              </List>

              <Collapse in={perfilOpen} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={t('DNI', 'DNI')}
                      value={(perfilForm as any).dni}
                      onChange={(e) => handlePerfilChange('dni', e.target.value)}
                      fullWidth
                      inputProps={{ inputMode: 'numeric', maxLength: 8 }}
                      helperText={t('8 dígitos', '8 digits')}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handlePerfilDniLookup} edge="end" disabled={perfilDniLoading || !/^\d{8}$/.test(String((perfilForm as any).dni || ''))}>
                              <Search />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label={t('Nombre completo', 'Full name')} value={perfilForm.nombreCompleto} onChange={e => handlePerfilChange('nombreCompleto', e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label={t('Celular', 'Phone')} value={perfilForm.telefono} onChange={e => handlePerfilChange('telefono', e.target.value)} type="tel" inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label={t('Correo', 'Email')} value={perfilForm.email} onChange={e => handlePerfilChange('email', e.target.value)} type="email" fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={t('Nueva contraseña', 'New password')}
                      type={showPerfilPassword ? 'text' : 'password'}
                      value={perfilForm.password}
                      onChange={e => handlePerfilChange('password', e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPerfilPassword((prev) => !prev)} edge="end">
                              {showPerfilPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Button variant="outlined" component="label" size="small">
                      {t('Subir foto', 'Upload photo')}
                      <input type="file" accept="image/*" hidden onChange={e => {
                        if (e.target.files && e.target.files[0]) handlePerfilImageUpload(e.target.files[0]);
                      }} />
                    </Button>
                    {perfilForm.fotoUrl && <Button size="small" color="error" onClick={() => handlePerfilChange('fotoUrl', '')}>{t('Quitar foto', 'Remove photo')}</Button>}
                  </Grid>
                  <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                    <Button variant="outlined" onClick={() => setPerfilOpen(false)}>{t('Cerrar', 'Close')}</Button>
                    <Button variant="contained" onClick={handlePerfilSave}>{t('Guardar cambios', 'Save changes')}</Button>
                  </Grid>
                </Grid>
                {perfilError && <Box mt={2}><Alert severity="error">{perfilError}</Alert></Box>}
                {perfilMsg && <Box mt={2}><Alert severity="success">{perfilMsg}</Alert></Box>}
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        {isAdmin && (
          <Grid item xs={12} lg={7}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Settings sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                      <Typography variant="h6">{t('Configuración del Sistema', 'System settings')}</Typography>
                    </Box>

                    <Box display="flex" gap={1} flexWrap="nowrap" mb={2}>
                      <Button variant={customOpen ? 'contained' : 'outlined'} size="small" onClick={() => setCustomOpen((prev) => !prev)}>
                        {customOpen ? t('Cerrar personalización', 'Close customization') : t('Abrir personalización', 'Open customization')}
                      </Button>
                      <Button variant={boletaOpen ? 'contained' : 'outlined'} size="small" onClick={() => setBoletaOpen((prev) => !prev)}>
                        {boletaOpen ? t('Cerrar boleta', 'Close receipt') : t('Abrir boleta', 'Open receipt')}
                      </Button>
                    </Box>

                    <Collapse in={customOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('Personalización', 'Customization')}</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField label={t('Nombre de la aplicación', 'Application name')} value={config.appName} onChange={e => handleConfigChange('appName', e.target.value)} fullWidth />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField label={t('Idioma', 'Language')} select value={config.idioma} onChange={e => handleConfigChange('idioma', e.target.value)} fullWidth>
                              <MenuItem value="es">{t('Español', 'Spanish')}</MenuItem>
                              <MenuItem value="en">English</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField label={t('Moneda', 'Currency')} select value={config.moneda} onChange={e => handleConfigChange('moneda', e.target.value)} fullWidth>
                              <MenuItem value="S/">S/ (Sol)</MenuItem>
                              <MenuItem value="$">$ (Dólar)</MenuItem>
                              <MenuItem value="€">€ (Euro)</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                              <Avatar src={config.logo} alt="Logo" sx={{ width: 56, height: 56, bgcolor: '#f5f5f5' }} />
                              <TextField
                                label={t('URL del logo', 'Logo URL')}
                                value={config.logo}
                                onChange={e => handleConfigChange('logo', e.target.value)}
                                fullWidth
                                sx={{ flex: 1, minWidth: 260 }}
                                InputProps={{
                                  endAdornment: config.logo && (
                                    <Button size="small" color="error" onClick={() => handleConfigChange('logo', '')}>{t('Quitar', 'Remove')}</Button>
                                  )
                                }}
                              />
                              <Button variant="outlined" component="label" size="small">
                                {t('Subir', 'Upload')}
                                <input type="file" accept="image/*" hidden onChange={e => {
                                  if (e.target.files && e.target.files[0]) handleImageUpload('logo', e.target.files[0]);
                                }} />
                              </Button>
                            </Box>
                          </Grid>
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                              <Avatar src={config.userImg} alt="Usuario" sx={{ width: 56, height: 56, bgcolor: '#f5f5f5' }} />
                              <TextField
                                label={t('URL de imagen de usuario', 'User image URL')}
                                value={config.userImg}
                                onChange={e => handleConfigChange('userImg', e.target.value)}
                                fullWidth
                                sx={{ flex: 1, minWidth: 260 }}
                                InputProps={{
                                  endAdornment: config.userImg && (
                                    <Button size="small" color="error" onClick={() => handleConfigChange('userImg', '')}>{t('Quitar', 'Remove')}</Button>
                                  )
                                }}
                              />
                              <Button variant="outlined" component="label" size="small">
                                {t('Subir', 'Upload')}
                                <input type="file" accept="image/*" hidden onChange={e => {
                                  if (e.target.files && e.target.files[0]) handleImageUpload('userImg', e.target.files[0]);
                                }} />
                              </Button>
                            </Box>
                          </Grid>
                          {configError && <Grid item xs={12}><Alert severity="error">{configError}</Alert></Grid>}
                          <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                            <Button variant="outlined" onClick={() => setCustomOpen(false)}>{t('Cerrar', 'Close')}</Button>
                            <Button variant="contained" onClick={handleConfigSave} disabled={!hasConfigChanges}>{t('Guardar personalización', 'Save customization')}</Button>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>

                    <Collapse in={deliveryOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('Delivery y contacto', 'Delivery and contact')}</Typography>
                        {tiendaState.loading && <Alert severity="info" sx={{ mb: 1.5 }}>{t('Cargando configuración de la tienda...', 'Loading store settings...')}</Alert>}
                        {tiendaState.error && <Alert severity="error" sx={{ mb: 1.5 }}>{tiendaState.error}</Alert>}
                        <FormControlLabel
                          control={<Checkbox checked={tiendaForm.deliveryEnabled} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliveryEnabled: e.target.checked }))} />}
                          label={t('Habilitar delivery', 'Enable delivery')}
                        />
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                          <Grid item xs={12}>
                            <TextField label={t('Dirección de la tienda (opcional)', 'Store address (optional)')} value={tiendaForm.tiendaDireccion} onChange={(e) => setTiendaForm(prev => ({ ...prev, tiendaDireccion: e.target.value }))} fullWidth />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField label={t('Latitud de la tienda', 'Store latitude')} value={tiendaForm.tiendaLat} onChange={(e) => setTiendaForm(prev => ({ ...prev, tiendaLat: e.target.value }))} fullWidth placeholder="-8.1159" />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField label={t('Longitud de la tienda', 'Store longitude')} value={tiendaForm.tiendaLng} onChange={(e) => setTiendaForm(prev => ({ ...prev, tiendaLng: e.target.value }))} fullWidth placeholder="-79.0299" />
                          </Grid>
                          <Grid item xs={12}>
                            <Button variant="outlined" onClick={handleUseTiendaLocation} disabled={tiendaGeoLoading}>
                              {tiendaGeoLoading ? t('Obteniendo...', 'Getting...') : t('Usar mi ubicación', 'Use my location')}
                            </Button>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField label={t('Correo de contacto (pedidos)', 'Contact email (orders)')} value={tiendaForm.contactEmail} onChange={(e) => setTiendaForm(prev => ({ ...prev, contactEmail: e.target.value }))} fullWidth />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField label={t('WhatsApp de contacto', 'Contact WhatsApp')} value={tiendaForm.contactWhatsapp} onChange={(e) => setTiendaForm(prev => ({ ...prev, contactWhatsapp: e.target.value }))} fullWidth helperText={t('Usa código país. Ej: +51 999999999', 'Use country code. Example: +51 999999999')} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Base (S/)', 'Base fee')} type="number" value={tiendaForm.deliveryBase} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliveryBase: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Incluye (km)', 'Included (km)')} type="number" value={tiendaForm.deliveryIncludedKm} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliveryIncludedKm: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Por km (S/)', 'Per km')} type="number" value={tiendaForm.deliveryPerKm} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliveryPerKm: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Mínimo (S/)', 'Minimum fee')} type="number" value={tiendaForm.deliveryMinFee} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliveryMinFee: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Pedido pequeño < (S/)', 'Small order <')} type="number" value={tiendaForm.deliverySmallOrderThreshold} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliverySmallOrderThreshold: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Recargo pedido pequeño (S/)', 'Small order fee')} type="number" value={tiendaForm.deliverySmallOrderFee} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliverySmallOrderFee: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Radio máximo (km)', 'Max radius (km)')} type="number" value={tiendaForm.deliveryMaxKm} onChange={(e) => setTiendaForm(prev => ({ ...prev, deliveryMaxKm: e.target.value }))} fullWidth inputProps={{ min: 0, step: '0.1' }} />
                          </Grid>
                          <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                            <Button variant="outlined" onClick={() => setDeliveryOpen(false)}>{t('Cerrar', 'Close')}</Button>
                            <Button variant="contained" onClick={handleSaveTiendaConfig} disabled={tiendaSaving || tiendaState.loading}>
                              {tiendaSaving ? t('Guardando...', 'Saving...') : t('Guardar delivery', 'Save delivery')}
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>

                    <Collapse in={boletaOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('Boleta de venta', 'Sales receipt')}</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField label={t('Título boleta (empresa)', 'Receipt title (company)')} value={boletaConfig.nombre} onChange={e => handleBoletaChange('nombre', e.target.value)} fullWidth />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label="RUC" value={boletaConfig.ruc} onChange={e => handleBoletaChange('ruc', e.target.value)} inputProps={{ maxLength: 11, inputMode: 'numeric', pattern: '[0-9]*' }} fullWidth />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label={t('Teléfono', 'Phone')} value={boletaConfig.telefono} onChange={e => handleBoletaChange('telefono', e.target.value)} inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }} fullWidth />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField label="Serie" value={boletaConfig.serie} onChange={e => handleBoletaChange('serie', e.target.value)} inputProps={{ maxLength: 3, inputMode: 'numeric', pattern: '[0-9]*' }} fullWidth />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField label={t('Dirección', 'Address')} value={boletaConfig.direccion} onChange={e => handleBoletaChange('direccion', e.target.value)} fullWidth />
                          </Grid>
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                              <Avatar src={boletaConfig.logo} alt="Logo boleta" sx={{ width: 56, height: 56, bgcolor: '#f5f5f5' }} />
                              <TextField
                                label={t('URL logo boleta', 'Receipt logo URL')}
                                value={boletaConfig.logo}
                                onChange={e => handleBoletaChange('logo', e.target.value)}
                                fullWidth
                                sx={{ flex: 1, minWidth: 260 }}
                                InputProps={{
                                  endAdornment: boletaConfig.logo && (
                                    <Button size="small" color="error" onClick={() => handleBoletaChange('logo', '')}>{t('Quitar', 'Remove')}</Button>
                                  )
                                }}
                              />
                              <Button variant="outlined" component="label" size="small">
                                {t('Subir', 'Upload')}
                                <input type="file" accept="image/*" hidden onChange={e => {
                                  if (e.target.files && e.target.files[0]) handleBoletaLogoUpload(e.target.files[0]);
                                }} />
                              </Button>
                            </Box>
                          </Grid>
                          {boletaError && <Grid item xs={12}><Alert severity="error">{boletaError}</Alert></Grid>}
                          <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                            <Button variant="outlined" onClick={() => setBoletaOpen(false)}>{t('Cerrar', 'Close')}</Button>
                            <Button variant="contained" onClick={handleBoletaSave}>{t('Guardar boleta', 'Save receipt')}</Button>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        )}

        {isAdmin && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Group sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                    <Typography variant="h6">{t('Gestión de Usuarios', 'User Management')}</Typography>
                  </Box>
                  <Button variant={usuariosOpen ? 'contained' : 'outlined'} size="small" onClick={() => setUsuariosOpen((prev) => !prev)}>
                    {usuariosOpen ? t('Cerrar', 'Close') : t('Abrir gestión', 'Open management')}
                  </Button>
                </Box>

                <Collapse in={usuariosOpen} timeout="auto" unmountOnExit>
                  {usuariosError && <Box mb={2}><Alert severity="error">{usuariosError}</Alert></Box>}
                  {usuariosMsg && <Box mb={2}><Alert severity="success">{usuariosMsg}</Alert></Box>}

                  <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, mb: 2, bgcolor: '#fafafa' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{t('Asignación rápida de permisos', 'Quick permission assignment')}</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label={t('Seleccionar usuario', 'Select user')}
                          select
                          value={quickPermUserId}
                          onChange={(e) => handleQuickUserChange(Number(e.target.value))}
                          disabled={usuarios.length === 0 || usuariosLoading}
                          fullWidth
                        >
                          {usuarios.map((u) => (
                            <MenuItem key={`quick-user-${u.id}`} value={u.id}>
                              {u.nombre_usuario} ({u.rol})
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <Grid container spacing={1}>
                          {PERMISSION_KEYS.map((permiso) => (
                            <Grid item xs={12} sm={6} md={4} key={`quick-${permiso}`}>
                              <FormControlLabel
                                control={<Checkbox checked={Boolean(quickPermisos[permiso])} onChange={(_e, checked) => handleQuickPermisoToggle(permiso, checked)} disabled={!quickSelectedUser || quickSelectedIsAdmin} />}
                                label={idioma === 'en'
                                  ? { ventas: 'Sales', pedidos: 'Orders', reparto: 'Delivery', mesas: 'Tables', productos: 'Products', proveedores: 'Suppliers', categorias: 'Categories', reportes: 'Reports', detalleCajero: 'Cashier Details', configuracion: 'Settings' }[permiso]
                                  : PERMISSION_LABELS[permiso]}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                      {quickSelectedIsAdmin && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            {t('El administrador siempre mantiene todos los accesos habilitados.', 'The administrator always keeps all accesses enabled.')}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                        <Button variant="outlined" onClick={() => setUsuariosOpen(false)}>{t('Cerrar', 'Close')}</Button>
                        <Button variant="contained" onClick={handleQuickPermisosSave} disabled={!quickSelectedUser || quickSelectedIsAdmin || savingQuickPermisos}>
                          {t('Guardar permisos', 'Save permissions')}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={12} md={3}>
                      <TextField label={t('Usuario', 'Username')} value={userForm.nombreUsuario} onChange={e => handleUserFormChange('nombreUsuario', e.target.value)} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField label={t('Nombre completo', 'Full name')} value={userForm.nombreCompleto} onChange={e => handleUserFormChange('nombreCompleto', e.target.value)} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField label={t('Rol', 'Role')} select value={userForm.rol} onChange={e => handleUserFormChange('rol', e.target.value)} fullWidth>
                        <MenuItem value="ADMINISTRADOR">{t('ADMINISTRADOR', 'ADMINISTRATOR')}</MenuItem>
                        <MenuItem value="CAJERO">{t('CAJERO', 'CASHIER')}</MenuItem>
                        <MenuItem value="REPARTIDOR">{t('REPARTIDOR', 'DELIVERY')}</MenuItem>
                      </TextField>
                    </Grid>
                    {userForm.rol === 'REPARTIDOR' && (
                      <>
                        <Grid item xs={12} md={2}>
                          <TextField label={t('Matrícula moto', 'Motorbike plate')} value={userForm.motoMatricula} onChange={e => handleUserFormChange('motoMatricula', e.target.value)} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField label={t('Estado repartidor', 'Courier status')} select value={userForm.repartidorEstado} onChange={e => handleUserFormChange('repartidorEstado', e.target.value)} fullWidth>
                            <MenuItem value="libre">{t('Libre', 'Available')}</MenuItem>
                            <MenuItem value="ocupado">{t('Ocupado', 'Busy')}</MenuItem>
                            <MenuItem value="inactivo">{t('Inactivo', 'Inactive')}</MenuItem>
                          </TextField>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12} md={2}>
                      <TextField label={t('Celular', 'Phone')} value={userForm.telefono} onChange={e => handleUserFormChange('telefono', e.target.value)} type="tel" inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField label={t('Correo', 'Email')} value={userForm.email} onChange={e => handleUserFormChange('email', e.target.value)} type="email" fullWidth />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        label={editingUserId ? t('Nueva contraseña', 'New password') : t('Contraseña', 'Password')}
                        type={showUserPassword ? 'text' : 'password'}
                        value={userForm.password}
                        onChange={e => handleUserFormChange('password', e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowUserPassword((prev) => !prev)} edge="end">
                                {showUserPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                      {editingUserId && <Button variant="outlined" onClick={resetUserForm}>{t('Cancelar', 'Cancel')}</Button>}
                      <Button variant="contained" onClick={handleUserSubmit}>{editingUserId ? t('Actualizar', 'Update') : t('Agregar', 'Add')}</Button>
                    </Grid>
                  </Grid>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('Usuario', 'Username')}</TableCell>
                          <TableCell>{t('Nombre completo', 'Full name')}</TableCell>
                          <TableCell>{t('Celular', 'Phone')}</TableCell>
                          <TableCell>{t('Correo', 'Email')}</TableCell>
                          <TableCell>{t('Rol', 'Role')}</TableCell>
                          <TableCell>{t('Moto', 'Motorbike')}</TableCell>
                          <TableCell>{t('Accesos', 'Access')}</TableCell>
                          <TableCell>{t('Estado', 'Status')}</TableCell>
                          <TableCell align="right">{t('Acciones', 'Actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {usuariosLoading ? (
                          <TableRow>
                            <TableCell colSpan={9}>{t('Cargando usuarios...', 'Loading users...')}</TableCell>
                          </TableRow>
                        ) : usuarios.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9}>{t('No hay usuarios registrados.', 'No users registered.')}</TableCell>
                          </TableRow>
                        ) : (
                          usuarios.map((u) => {
                            const lockUntil = u.lock_until ? new Date(u.lock_until) : null;
                            const isTempLocked = lockUntil ? lockUntil > new Date() : false;
                            const isBlocked = Boolean(u.is_blocked);
                            const isActive = u.is_active !== 0;
                            const permisosUsuario = normalizePermissions(u.rol, u.permisos || null);
                            const accesosHabilitados = PERMISSION_KEYS.filter((permiso) => permisosUsuario[permiso]).map((permiso) => PERMISSION_LABELS[permiso]);
                            return (
                              <TableRow key={u.id}>
                                <TableCell>{u.nombre_usuario}</TableCell>
                                <TableCell>{u.nombre_completo}</TableCell>
                                <TableCell>{u.telefono || '-'}</TableCell>
                                <TableCell>{u.email || '-'}</TableCell>
                                <TableCell>{u.rol}</TableCell>
                                <TableCell>{u.rol === 'REPARTIDOR' ? (u.moto_matricula || '-') : '-'}</TableCell>
                                <TableCell>
                                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                                    {accesosHabilitados.map((acceso) => (
                                      <Chip key={`${u.id}-${acceso}`} label={acceso} size="small" />
                                    ))}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {!isActive ? t('Inactivo', 'Inactive') : isBlocked ? t('Bloqueado', 'Blocked') : isTempLocked ? t('Temporal', 'Temporary') : t('Activo', 'Active')}
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton onClick={() => handleEditUsuario(u)} size="small"><Edit fontSize="small" /></IconButton>
                                  {(isBlocked || isTempLocked) && <IconButton onClick={() => handleUnlockUsuario(u)} size="small" color="success"><LockOpen fontSize="small" /></IconButton>}
                                  <IconButton onClick={() => handleToggleActivo(u)} size="small" color={isActive ? 'warning' : 'success'}>
                                    {isActive ? <Block fontSize="small" /> : <LockOpen fontSize="small" />}
                                  </IconButton>
                                  <IconButton onClick={() => handleDeleteUsuario(u)} size="small" color="error" disabled={u.nombre_usuario === user?.nombreUsuario}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Security sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Typography variant="h6">{t('Acciones de Seguridad', 'Security Actions')}</Typography>
              </Box>
              <Button variant="outlined" color="error" startIcon={<Logout />} onClick={handleLogout}>
                {t('Cerrar Sesión', 'Log Out')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Info sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Typography variant="h6">{t('Información del Sistema', 'System Information')}</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary"><strong>{t('Desarrollado por', 'Developed by')}:</strong> Equipo de Desarrollo</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary"><strong>{t('Fecha de lanzamiento', 'Release date')}:</strong> 2024</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary"><strong>{t('Tecnologías', 'Technologies')}:</strong> React, TypeScript, Material-UI</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary"><strong>{t('Base de datos', 'Database')}:</strong> MySQL</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {t('Los datos principales del sistema se almacenan en MySQL.', 'The main system data is stored in MySQL.')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={Boolean(toastMsg)}
        autoHideDuration={2000}
        onClose={() => setToastMsg('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: '50% !important',
          bottom: 'auto !important',
          transform: 'translateY(-50%)'
        }}
      >
        <Alert
          onClose={() => setToastMsg('')}
          severity="success"
          variant="filled"
          sx={{ minWidth: 220, justifyContent: 'center', boxShadow: 3 }}
        >
          {toastMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ConfiguracionPage; 
