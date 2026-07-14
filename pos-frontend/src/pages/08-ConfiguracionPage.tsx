/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/08-ConfiguracionPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { Add, Block, Delete, Edit, LockOpen, People, Refresh, Save, Search, Settings, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  asignarFondoCaja,
  createUsuario,
  deleteUsuario,
  getConfiguracionSistema,
  getFondosCaja,
  getPersonaPorDni,
  getUsuarios,
  saveConfiguracionSistema,
  unlockUsuario,
  updateUsuario
} from '../services/api';
import { CajaFondoAsignado, PermissionKey, UsuarioItem, UserPermissions } from '../types';
import {
  DEFAULT_CAJERO_PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  normalizePermissions
} from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { AppConfig, loadAppConfig, saveAppConfig } from '../utils/appConfig';
import { BoletaConfig, loadBoletaConfig, saveBoletaConfig } from '../utils/boletaConfig';
import { VueltoConfig, loadVueltoConfig, saveVueltoConfig } from '../utils/vueltoConfig';

// TIPOS FRONTEND: alias UserFormState para ordenar datos internos.
type UserFormState = {
  nombreUsuario: string;
  nombreCompleto: string;
  rol: 'ADMINISTRADOR' | 'CAJERO';
  password: string;
  dni: string;
  telefono: string;
  email: string;
  permisos: UserPermissions;
};

const createDefaultUserForm = (): UserFormState => ({
  nombreUsuario: '',
  nombreCompleto: '',
  rol: 'CAJERO',
  password: '',
  dni: '',
  telefono: '',
  email: '',
  permisos: { ...DEFAULT_CAJERO_PERMISSIONS }
});

// LOGICA: is Usuario Active concentra una operacion de este archivo.
const isUsuarioActive = (usuario: UsuarioItem) => usuario.is_active !== 0 && usuario.is_active !== false;
const PASSWORD_MESSAGE = 'La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
const isStrongPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(value);

type ConfigPanel = 'personalizacion' | 'boleta' | 'caja';
const formatCurrency = (value: number | undefined | null) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ConfiguracionPage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(createDefaultUserForm());
  const [showPassword, setShowPassword] = useState(false);
  const [dniLoading, setDniLoading] = useState(false);
  const [activeConfigPanel, setActiveConfigPanel] = useState<ConfigPanel>('personalizacion');
  const [appConfigForm, setAppConfigForm] = useState<AppConfig>(() => loadAppConfig());
  const [boletaConfigForm, setBoletaConfigForm] = useState<BoletaConfig>(() => loadBoletaConfig());
  const [vueltoConfigForm, setVueltoConfigForm] = useState<VueltoConfig>(() => loadVueltoConfig());
  const [fondosCaja, setFondosCaja] = useState<CajaFondoAsignado[]>([]);
  const [fondoUsuarioId, setFondoUsuarioId] = useState('');
  const [fondoMonto, setFondoMonto] = useState('');
  const [fondoNota, setFondoNota] = useState('');
  const [fondoSaving, setFondoSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const isAdmin = String(user?.rol || '').toUpperCase() === 'ADMINISTRADOR';
  const editingUser = useMemo(
    () => usuarios.find((usuario) => usuario.id === editingUserId) || null,
    [editingUserId, usuarios]
  );
  const adminExistente = useMemo(
    () => usuarios.find((usuario) => String(usuario.rol || '').toUpperCase() === 'ADMINISTRADOR') || null,
    [usuarios]
  );
  const puedeSeleccionarAdministrador = !adminExistente || adminExistente.id === editingUserId;
  const cajeros = useMemo(
    () => usuarios.filter((usuario) => String(usuario.rol || '').toUpperCase() === 'CAJERO' && isUsuarioActive(usuario)),
    [usuarios]
  );

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

// LOGICA: read File As Data Url convierte imagenes subidas en texto para guardarlas en localStorage.
  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// LOGICA: handle Image Upload centraliza la carga de logo/app y logo de boleta.
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'appLogo' | 'boletaLogo'
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (target === 'appLogo') {
        setAppConfigForm((prev) => ({ ...prev, logo: dataUrl }));
      } else {
        setBoletaConfigForm((prev) => ({ ...prev, logo: dataUrl }));
      }
    } catch {
      showSnackbar('No se pudo cargar la imagen.', 'error');
    }
  };

// LOGICA: handle Save App Config guarda nombre, idioma, moneda e imagenes personalizadas.
  const handleSaveAppConfig = async () => {
    const saved = saveAppConfig(appConfigForm);
    setAppConfigForm(saved);
    try {
      await saveConfiguracionSistema({ personalizacion: saved, boleta: boletaConfigForm, vueltos: vueltoConfigForm });
      showSnackbar('Personalización guardada correctamente.', 'success');
    } catch {
      showSnackbar('Personalización guardada localmente, pero no se pudo guardar en la base de datos.', 'error');
    }
  };

// LOGICA: handle Save Boleta Config guarda los datos usados por la boleta de venta.
  const handleSaveBoletaConfig = async () => {
    const saved = saveBoletaConfig(boletaConfigForm);
    setBoletaConfigForm(saved);
    try {
      await saveConfiguracionSistema({ personalizacion: appConfigForm, boleta: saved, vueltos: vueltoConfigForm });
      showSnackbar('Boleta guardada correctamente.', 'success');
    } catch {
      showSnackbar('Boleta guardada localmente, pero no se pudo guardar en la base de datos.', 'error');
    }
  };

  const handleSaveVueltoConfig = async () => {
    const saved = saveVueltoConfig(vueltoConfigForm);
    setVueltoConfigForm(saved);
    try {
      await saveConfiguracionSistema({ personalizacion: appConfigForm, boleta: boletaConfigForm, vueltos: saved });
      showSnackbar('Monto para vueltos guardado correctamente.', 'success');
    } catch {
      showSnackbar('Monto para vueltos guardado localmente, pero no se pudo guardar en la base de datos.', 'error');
    }
  };

  const handleAsignarFondoCaja = async () => {
    const usuarioId = Number(fondoUsuarioId);
    const monto = Number(fondoMonto);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      showSnackbar('Selecciona un cajero.', 'error');
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      showSnackbar('Ingresa un fondo mayor a cero.', 'error');
      return;
    }
    try {
      setFondoSaving(true);
      const fondo = await asignarFondoCaja({ usuarioId, monto, nota: fondoNota.trim() || null });
      setFondosCaja((prev) => [fondo, ...prev]);
      setFondoUsuarioId('');
      setFondoMonto('');
      setFondoNota('');
      showSnackbar('Fondo asignado correctamente al cajero.', 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo asignar el fondo de caja.', 'error');
    } finally {
      setFondoSaving(false);
    }
  };

  const loadUsuarios = useCallback(async () => {
    setUsuariosLoading(true);
    try {
      const data = await getUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || t('No se pudieron cargar los usuarios.', 'Could not load users.'), 'error');
    } finally {
      setUsuariosLoading(false);
    }
  }, [showSnackbar, t]);

  const loadFondosCaja = useCallback(async () => {
    try {
      const data = await getFondosCaja();
      setFondosCaja(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudieron cargar los fondos de caja.', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    if (isAdmin) {
      void loadUsuarios();
      void loadFondosCaja();
    }
  }, [isAdmin, loadUsuarios, loadFondosCaja]);

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;
// LOGICA/BASE DE DATOS: carga Personalizacion y Boleta persistidas en MySQL y sincroniza localStorage.
    const loadConfiguracionSistema = async () => {
      try {
        const data = await getConfiguracionSistema();
        if (!active) return;
        if (data.personalizacion) {
          const savedAppConfig = saveAppConfig(data.personalizacion);
          setAppConfigForm(savedAppConfig);
        }
        if (data.boleta) {
          const savedBoletaConfig = saveBoletaConfig(data.boleta);
          setBoletaConfigForm(savedBoletaConfig);
        }
        if (data.vueltos) {
          const savedVueltoConfig = saveVueltoConfig(data.vueltos);
          setVueltoConfigForm(savedVueltoConfig);
        }
      } catch {
        // Si el backend no esta disponible, se mantiene la configuracion local para no bloquear la pantalla.
      }
    };

    void loadConfiguracionSistema();
    return () => {
      active = false;
    };
  }, [isAdmin]);

// ============================================================
// LOGICA: FUNCIONES DE GESTIÓN DE ESTADO
// ============================================================

// LOGICA: reset User Form concentra una operacion de este archivo.
  const resetUserForm = () => {
    setUserForm(createDefaultUserForm());
    setEditingUserId(null);
    setShowPassword(false);
  };

// LOGICA: handle Text Change concentra una operacion de este archivo.
  const handleTextChange = (field: keyof Omit<UserFormState, 'permisos'>, rawValue: string) => {
    if (field === 'telefono') {
      setUserForm((prev) => ({ ...prev, telefono: rawValue.replace(/\D/g, '').slice(0, 9) }));
      return;
    }
    if (field === 'dni') {
      setUserForm((prev) => ({ ...prev, dni: rawValue.replace(/\D/g, '').slice(0, 8) }));
      return;
    }
    if (field === 'rol') {
      const rol = rawValue as 'ADMINISTRADOR' | 'CAJERO';
      setUserForm((prev) => ({
        ...prev,
        rol,
        permisos: normalizePermissions(rol, rol === 'ADMINISTRADOR' ? null : prev.permisos)
      }));
      return;
    }
    setUserForm((prev) => ({ ...prev, [field]: rawValue }));
  };

  const handleBuscarDniUsuario = async () => {
    const dni = userForm.dni.trim();
    if (!/^\d{8}$/.test(dni)) {
      showSnackbar('Ingrese un DNI válido de 8 dígitos.', 'error');
      return;
    }

    setDniLoading(true);
    try {
      const persona = await getPersonaPorDni(dni);
      const nombreCompleto = (persona.nombreCompleto || [persona.nombres, persona.apellidos].filter(Boolean).join(' ')).trim();
      if (!nombreCompleto) {
        showSnackbar('No se encontraron datos para ese DNI.', 'error');
        return;
      }
      setUserForm((prev) => ({
        ...prev,
        dni: persona.dni || dni,
        nombreCompleto
      }));
      showSnackbar('Datos cargados desde DNI.', 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || 'No se pudo consultar el DNI.', 'error');
    } finally {
      setDniLoading(false);
    }
  };

// LOGICA: handle Permiso Toggle concentra una operacion de este archivo.
  const handlePermisoToggle = (permiso: PermissionKey, enabled: boolean) => {
    setUserForm((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [permiso]: enabled
      }
    }));
  };

// LOGICA: validate Form concentra una operacion de este archivo.
  const validateForm = () => {
    if (!userForm.nombreUsuario.trim() || !userForm.nombreCompleto.trim()) {
      return 'Completa usuario y nombre completo.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) {
      return 'Ingresa un correo válido para recuperación de contraseña.';
    }
    if (!editingUserId && !userForm.password.trim()) {
      return 'La contraseña es obligatoria para crear usuario.';
    }
    if (userForm.password.trim() && !isStrongPassword(userForm.password.trim())) {
      return PASSWORD_MESSAGE;
    }
    if (userForm.dni && !/^\d{8}$/.test(userForm.dni)) {
      return 'El DNI debe tener 8 dígitos.';
    }
    if (userForm.telefono && !/^\d{9}$/.test(userForm.telefono)) {
      return 'El teléfono debe tener 9 dígitos.';
    }
    return '';
  };

// LOGICA: handle User Submit concentra una operacion de este archivo.
  const handleUserSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    const payload = {
      nombreUsuario: userForm.nombreUsuario.trim(),
      nombreCompleto: userForm.nombreCompleto.trim(),
      rol: userForm.rol,
      password: userForm.password.trim() || undefined,
      dni: userForm.dni || null,
      telefono: userForm.telefono || null,
      email: userForm.email.trim().toLowerCase(),
      permisos: userForm.permisos
    };

    try {
      if (editingUserId) {
        await updateUsuario(editingUserId, payload);
        showSnackbar(t('Usuario actualizado correctamente.', 'User updated successfully.'), 'success');
      } else {
        await createUsuario(payload);
        showSnackbar(t('Usuario creado correctamente.', 'User created successfully.'), 'success');
      }
      resetUserForm();
      await loadUsuarios();
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || t('No se pudo guardar el usuario.', 'Could not save user.'), 'error');
    }
  };

// LOGICA: handle Edit Usuario concentra una operacion de este archivo.
  const handleEditUsuario = (usuario: UsuarioItem) => {
    const rol = usuario.rol;
    setEditingUserId(usuario.id);
    setUserForm({
      nombreUsuario: usuario.nombre_usuario,
      nombreCompleto: usuario.nombre_completo,
      rol,
      password: '',
      dni: usuario.dni || '',
      telefono: usuario.telefono || '',
      email: usuario.email || '',
      permisos: normalizePermissions(rol, usuario.permisos || null)
    });
    setShowPassword(false);
  };

// LOGICA: handle Toggle Activo concentra una operacion de este archivo.
  const handleToggleActivo = async (usuario: UsuarioItem) => {
    if (usuario.nombre_usuario === user?.nombreUsuario) {
      showSnackbar(t('No puedes desactivar tu propio usuario.', 'You cannot deactivate your own user.'), 'error');
      return;
    }
    try {
      await updateUsuario(usuario.id, {
        nombreUsuario: usuario.nombre_usuario,
        nombreCompleto: usuario.nombre_completo,
        rol: usuario.rol,
        dni: usuario.dni || null,
        telefono: usuario.telefono || null,
        email: usuario.email || null,
        permisos: normalizePermissions(usuario.rol, usuario.permisos || null),
        isActive: !isUsuarioActive(usuario)
      });
      await loadUsuarios();
      showSnackbar(t('Estado actualizado.', 'Status updated.'), 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || t('No se pudo actualizar el estado.', 'Could not update status.'), 'error');
    }
  };

// LOGICA: handle Unlock Usuario concentra una operacion de este archivo.
  const handleUnlockUsuario = async (usuario: UsuarioItem) => {
    try {
      await unlockUsuario(usuario.id);
      await loadUsuarios();
      showSnackbar(t('Usuario desbloqueado.', 'User unlocked.'), 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || t('No se pudo desbloquear el usuario.', 'Could not unlock user.'), 'error');
    }
  };

// LOGICA: handle Delete Usuario concentra una operacion de este archivo.
  const handleDeleteUsuario = async (usuario: UsuarioItem) => {
    if (usuario.nombre_usuario === user?.nombreUsuario) {
      showSnackbar(t('No puedes eliminar tu propio usuario.', 'You cannot delete your own user.'), 'error');
      return;
    }
    if (!window.confirm(`¿Eliminar usuario ${usuario.nombre_usuario}?`)) return;
    try {
      await deleteUsuario(usuario.id);
      await loadUsuarios();
      showSnackbar(t('Usuario eliminado.', 'User deleted.'), 'success');
    } catch (error: any) {
      showSnackbar(error?.response?.data?.message || t('No se pudo eliminar el usuario.', 'Could not delete user.'), 'error');
    }
  };

// ============================================================
// DISEÑO: INTERFAZ VISUAL DE LA PÁGINA
// ============================================================

  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">{t('Solo el administrador puede gestionar usuarios.', 'Only the administrator can manage users.')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <People color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h4" component="h1">
            {t('Configuración', 'Settings')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => {
            void loadUsuarios();
            void loadFondosCaja();
          }}
          disabled={usuariosLoading}
        >
          {t('Actualizar', 'Refresh')}
        </Button>
      </Box>

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} lg={8}>
          {/* DISEÑO: Formulario "Nuevo Usuario" - Líneas de entrada de datos */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {editingUser ? t('Editar usuario', 'Edit user') : t('Nuevo usuario', 'New user')}
            </Typography>
            <Grid container spacing={2}>
              {/* DISEÑO: Campo Usuario */}
              <Grid item xs={12} md={3}>
                <TextField label={t('Usuario', 'Username')} value={userForm.nombreUsuario} onChange={(event) => handleTextChange('nombreUsuario', event.target.value)} fullWidth />
              </Grid>
              {/* DISEÑO: Campo Nombre completo */}
              <Grid item xs={12} md={3}>
                <TextField label={t('Nombre completo', 'Full name')} value={userForm.nombreCompleto} onChange={(event) => handleTextChange('nombreCompleto', event.target.value)} fullWidth />
              </Grid>
              {/* DISEÑO: Campo Rol (dropdown) */}
              <Grid item xs={12} md={2}>
                <TextField label={t('Rol', 'Role')} select value={userForm.rol} onChange={(event) => handleTextChange('rol', event.target.value)} fullWidth>
                  <MenuItem value="ADMINISTRADOR" disabled={!puedeSeleccionarAdministrador}>{t('ADMINISTRADOR', 'ADMINISTRATOR')}</MenuItem>
                  <MenuItem value="CAJERO">{t('CAJERO', 'CASHIER')}</MenuItem>
                </TextField>
              </Grid>
              {/* DISEÑO: Campo DNI */}
              <Grid item xs={12} md={2}>
                <TextField
                  label="DNI"
                  value={userForm.dni}
                  onChange={(event) => handleTextChange('dni', event.target.value)}
                  inputProps={{ maxLength: 8, inputMode: 'numeric' }}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleBuscarDniUsuario} disabled={dniLoading || userForm.dni.length !== 8}>
                          <Search fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              {/* DISEÑO: Campo Celular */}
              <Grid item xs={12} md={2}>
                <TextField label={t('Celular', 'Phone')} value={userForm.telefono} onChange={(event) => handleTextChange('telefono', event.target.value)} inputProps={{ maxLength: 9, inputMode: 'numeric' }} fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('Correo para recuperación', 'Recovery email')}
                  type="email"
                  value={userForm.email}
                  onChange={(event) => handleTextChange('email', event.target.value)}
                  helperText={t('Aquí llegará el código para cambiar la contraseña.', 'Password reset codes will be sent here.')}
                  required
                  fullWidth
                />
              </Grid>
              {/* DISEÑO: Campo Contraseña (con ojo para ver/ocultar) */}
              <Grid item xs={12} md={6}>
                <TextField
                  label={editingUserId ? t('Nueva contraseña', 'New password') : t('Contraseña', 'Password')}
                  type={showPassword ? 'text' : 'password'}
                  value={userForm.password}
                  onChange={(event) => handleTextChange('password', event.target.value)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              {/* DISEÑO: Checkboxes de Permisos */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('Permisos', 'Permissions')}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {PERMISSION_KEYS.map((permiso) => (
                    <FormControlLabel
                      key={permiso}
                      control={
                        <Checkbox
                          checked={Boolean(userForm.permisos[permiso])}
                          onChange={(_event, checked) => handlePermisoToggle(permiso, checked)}
                          disabled={userForm.rol === 'ADMINISTRADOR'}
                        />
                      }
                      label={PERMISSION_LABELS[permiso]}
                    />
                  ))}
                </Box>
                {userForm.rol === 'ADMINISTRADOR' && (
                  <Typography variant="caption" color="text.secondary">
                    {t('El administrador siempre tiene todos los permisos.', 'The administrator always has all permissions.')}
                  </Typography>
                )}
              </Grid>
              {/* DISEÑO: Botones Agregar/Actualizar/Cancelar */}
              <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                {editingUserId && (
                  <Button variant="outlined" onClick={resetUserForm}>
                    {t('Cancelar', 'Cancel')}
                  </Button>
                )}
                <Button variant="contained" startIcon={editingUserId ? <Save /> : <Add />} onClick={handleUserSubmit}>
                  {editingUserId ? t('Actualizar', 'Update') : t('Agregar', 'Add')}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* DISEÑO: Tabla de Usuarios - Visualización de datos */}
          <TableContainer component={Paper}>
            <Table size="small" sx={{ minWidth: 980 }}>
          {/* DISEÑO: Encabezados de la tabla */}
          <TableHead>
            <TableRow>
              <TableCell>{t('Usuario', 'Username')}</TableCell>
              <TableCell>{t('Nombre completo', 'Full name')}</TableCell>
              <TableCell>{t('Correo', 'Email')}</TableCell>
              <TableCell>{t('Celular', 'Phone')}</TableCell>
              <TableCell>{t('Rol', 'Role')}</TableCell>
              <TableCell>{t('Accesos', 'Access')}</TableCell>
              <TableCell>{t('Estado', 'Status')}</TableCell>
              <TableCell align="right">{t('Acciones', 'Actions')}</TableCell>
            </TableRow>
          </TableHead>
          {/* DISEÑO: Filas de la tabla con datos de usuarios */}
          <TableBody>
            {usuariosLoading ? (
              <TableRow>
                <TableCell colSpan={8}>{t('Cargando usuarios...', 'Loading users...')}</TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>{t('No hay usuarios registrados.', 'No users registered.')}</TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => {
                const permisos = normalizePermissions(usuario.rol, usuario.permisos || null);
                const accesos = PERMISSION_KEYS.filter((permiso) => permisos[permiso]).map((permiso) => PERMISSION_LABELS[permiso]);
                const active = isUsuarioActive(usuario);
                const blocked = Boolean(usuario.is_blocked);
                return (
                  <TableRow key={usuario.id}>
                    <TableCell>{usuario.nombre_usuario}</TableCell>
                    <TableCell>{usuario.nombre_completo}</TableCell>
                    <TableCell sx={{ maxWidth: 190, wordBreak: 'break-word' }}>{usuario.email || '-'}</TableCell>
                    <TableCell>{usuario.telefono || '-'}</TableCell>
                    <TableCell>{usuario.rol}</TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {accesos.map((acceso) => (
                          <Chip key={`${usuario.id}-${acceso}`} label={acceso} size="small" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {!active ? t('Inactivo', 'Inactive') : blocked ? t('Bloqueado', 'Blocked') : t('Activo', 'Active')}
                    </TableCell>
                    {/* DISEÑO: Botones de Acciones (Editar, Desbloquear, Bloquear, Eliminar) */}
                    <TableCell align="right">
                      {/* DISEÑO: Botón Editar */}
                      <IconButton size="small" color="primary" onClick={() => handleEditUsuario(usuario)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      {/* DISEÑO: Botón Desbloquear (solo si está bloqueado) */}
                      {blocked && (
                        <IconButton size="small" color="success" onClick={() => handleUnlockUsuario(usuario)}>
                          <LockOpen fontSize="small" />
                        </IconButton>
                      )}
                      {/* DISEÑO: Botón Bloquear/Desbloquear */}
                      <IconButton size="small" color={active ? 'warning' : 'success'} onClick={() => handleToggleActivo(usuario)}>
                        {active ? <Block fontSize="small" /> : <LockOpen fontSize="small" />}
                      </IconButton>
                      {/* DISEÑO: Botón Eliminar */}
                      <IconButton size="small" color="error" disabled={usuario.nombre_usuario === user?.nombreUsuario} onClick={() => handleDeleteUsuario(usuario)}>
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
        </Grid>

        {/* DISEÑO: Panel derecho de configuracion del sistema con botones solo horizontales. */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            {/* DISEÑO: Cabecera del panel, muestra el icono morado y el titulo de configuracion. */}
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <Settings color="secondary" sx={{ fontSize: 34 }} />
              <Typography variant="h6" component="h2">
                Configuración del Sistema
              </Typography>
            </Box>

            {/* DISEÑO: Botonera horizontal para cambiar entre la carcasa de Personalizacion y Boleta. */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {/* DISEÑO: Boton izquierdo; activo en azul cuando se esta viendo Personalizacion. */}
              <Button
                size="small"
                fullWidth
                variant={activeConfigPanel === 'personalizacion' ? 'contained' : 'outlined'}
                onClick={() => setActiveConfigPanel('personalizacion')}
              >
                {activeConfigPanel === 'personalizacion' ? 'Cerrar personalización' : 'Abrir personalización'}
              </Button>
              {/* DISEÑO: Boton derecho; activo en azul cuando se esta viendo Boleta. */}
              <Button
                size="small"
                fullWidth
                variant={activeConfigPanel === 'boleta' ? 'contained' : 'outlined'}
                onClick={() => setActiveConfigPanel('boleta')}
              >
                {activeConfigPanel === 'boleta' ? 'Cerrar boleta' : 'Abrir boleta'}
              </Button>
              <Button
                size="small"
                fullWidth
                variant={activeConfigPanel === 'caja' ? 'contained' : 'outlined'}
                onClick={() => setActiveConfigPanel('caja')}
              >
                {activeConfigPanel === 'caja' ? 'Cerrar caja' : 'Abrir caja'}
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {activeConfigPanel === 'personalizacion' ? (
              <Box>
                {/* DISEÑO: Subtitulo interno del formulario de Personalizacion. */}
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Personalización
                </Typography>
                {/* LOGICA/BASE DE DATOS: estos campos se guardan en localStorage y MySQL. */}
                {/* DISEÑO: Grid del formulario; ordena campos en filas y columnas responsivas. */}
                <Grid container spacing={2}>
                  {/* DISEÑO: Campo ancho completo para escribir el nombre de la aplicacion. */}
                  <Grid item xs={12}>
                    <TextField
                      label="Nombre de la aplicación"
                      value={appConfigForm.appName}
                      onChange={(event) => setAppConfigForm((prev) => ({ ...prev, appName: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  {/* DISEÑO: Campo select de idioma; ocupa media fila en pantallas medianas. */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Idioma"
                      select
                      value={appConfigForm.idioma}
                      onChange={(event) => setAppConfigForm((prev) => ({ ...prev, idioma: event.target.value }))}
                      fullWidth
                    >
                      <MenuItem value="es">Español</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </TextField>
                  </Grid>
                  {/* DISEÑO: Campo select de moneda; queda a la derecha del idioma. */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Moneda"
                      select
                      value={appConfigForm.moneda}
                      onChange={(event) => setAppConfigForm((prev) => ({ ...prev, moneda: event.target.value }))}
                      fullWidth
                    >
                      <MenuItem value="S/">S/ (Sol)</MenuItem>
                      <MenuItem value="$">$ (Dólar)</MenuItem>
                    </TextField>
                  </Grid>
                  {/* DISEÑO: Fila del logo principal con vista previa circular, input de URL y boton Subir. */}
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      {/* DISEÑO: Avatar usado solo como preview visual del logo. */}
                      <Avatar src={appConfigForm.logo} alt="Logo" sx={{ width: 48, height: 48, bgcolor: '#f5f5f5' }} />
                      {/* DISEÑO: Campo para pegar o mostrar la URL/base64 del logo. */}
                      <TextField
                        label="URL del logo"
                        value={appConfigForm.logo}
                        onChange={(event) => setAppConfigForm((prev) => ({ ...prev, logo: event.target.value }))}
                        fullWidth
                        InputProps={{
                          endAdornment: appConfigForm.logo ? (
                            <InputAdornment position="end">
                              {/* DISEÑO: Boton pequeño dentro del campo para quitar la imagen mostrada. */}
                              <Button color="error" size="small" onClick={() => setAppConfigForm((prev) => ({ ...prev, logo: '' }))}>
                                Quitar
                              </Button>
                            </InputAdornment>
                          ) : null
                        }}
                      />
                      {/* DISEÑO: Boton externo para seleccionar una imagen desde el equipo. */}
                      <Button variant="outlined" component="label" size="small">
                        Subir
                        <input hidden accept="image/*" type="file" onChange={(event) => handleImageUpload(event, 'appLogo')} />
                      </Button>
                    </Box>
                  </Grid>
                  {/* DISEÑO: Fila final de acciones, alineada a la derecha. */}
                  <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                    {/* DISEÑO: Boton secundario de cierre/cancelacion visual. */}
                    <Button variant="outlined" onClick={() => setAppConfigForm(loadAppConfig())}>
                      Cerrar
                    </Button>
                    {/* DISEÑO: Boton principal azul para guardar la personalizacion. */}
                    <Button variant="contained" onClick={handleSaveAppConfig}>
                      Guardar personalización
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : activeConfigPanel === 'boleta' ? (
              <Box>
                {/* DISEÑO: Subtitulo interno del formulario de Boleta. */}
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Boleta de venta
                </Typography>
                {/* LOGICA/BASE DE DATOS: estos datos alimentan la impresion de ventas y se guardan en localStorage y MySQL. */}
                {/* DISEÑO: Grid del formulario de boleta; agrupa campos de empresa y logo. */}
                <Grid container spacing={2}>
                  {/* DISEÑO: Campo ancho completo para el titulo/nombre de empresa en la boleta. */}
                  <Grid item xs={12}>
                    <TextField
                      label="Título boleta (empresa)"
                      value={boletaConfigForm.nombre}
                      onChange={(event) => setBoletaConfigForm((prev) => ({ ...prev, nombre: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  {/* DISEÑO: Campo corto para RUC; primera columna de la fila de datos fiscales. */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="RUC"
                      value={boletaConfigForm.ruc}
                      onChange={(event) => setBoletaConfigForm((prev) => ({ ...prev, ruc: event.target.value.replace(/\D/g, '').slice(0, 11) }))}
                      inputProps={{ maxLength: 11, inputMode: 'numeric' }}
                      fullWidth
                    />
                  </Grid>
                  {/* DISEÑO: Campo corto para telefono; segunda columna de la fila. */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Teléfono"
                      value={boletaConfigForm.telefono}
                      onChange={(event) => setBoletaConfigForm((prev) => ({ ...prev, telefono: event.target.value.replace(/\D/g, '').slice(0, 9) }))}
                      inputProps={{ maxLength: 9, inputMode: 'numeric' }}
                      fullWidth
                    />
                  </Grid>
                  {/* DISEÑO: Campo corto para serie; tercera columna de la fila. */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Serie"
                      value={boletaConfigForm.serie}
                      onChange={(event) => setBoletaConfigForm((prev) => ({ ...prev, serie: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  {/* DISEÑO: Campo ancho completo para direccion de la empresa. */}
                  <Grid item xs={12}>
                    <TextField
                      label="Dirección"
                      value={boletaConfigForm.direccion}
                      onChange={(event) => setBoletaConfigForm((prev) => ({ ...prev, direccion: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  {/* DISEÑO: Fila del logo de boleta con preview, campo de URL y boton Subir. */}
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      {/* DISEÑO: Avatar usado como preview del logo que se imprimira en la boleta. */}
                      <Avatar src={boletaConfigForm.logo} alt="Logo boleta" sx={{ width: 48, height: 48, bgcolor: '#f5f5f5' }} />
                      {/* DISEÑO: Campo para pegar o mostrar la URL/base64 del logo de boleta. */}
                      <TextField
                        label="URL logo boleta"
                        value={boletaConfigForm.logo}
                        onChange={(event) => setBoletaConfigForm((prev) => ({ ...prev, logo: event.target.value }))}
                        fullWidth
                        InputProps={{
                          endAdornment: boletaConfigForm.logo ? (
                            <InputAdornment position="end">
                              {/* DISEÑO: Boton pequeno dentro del campo para limpiar el logo. */}
                              <Button color="error" size="small" onClick={() => setBoletaConfigForm((prev) => ({ ...prev, logo: '' }))}>
                                Quitar
                              </Button>
                            </InputAdornment>
                          ) : null
                        }}
                      />
                      {/* DISEÑO: Boton externo para seleccionar el logo de boleta desde el equipo. */}
                      <Button variant="outlined" component="label" size="small">
                        Subir
                        <input hidden accept="image/*" type="file" onChange={(event) => handleImageUpload(event, 'boletaLogo')} />
                      </Button>
                    </Box>
                  </Grid>
                  {/* DISEÑO: Fila final de acciones de boleta, alineada a la derecha. */}
                  <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                    {/* DISEÑO: Boton secundario de cierre/cancelacion visual. */}
                    <Button variant="outlined" onClick={() => setBoletaConfigForm(loadBoletaConfig())}>
                      Cerrar
                    </Button>
                    {/* DISEÑO: Boton principal azul para guardar la configuracion de boleta. */}
                    <Button variant="contained" onClick={handleSaveBoletaConfig}>
                      Guardar boleta
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Caja y fondos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configura el vuelto referencial y asigna el efectivo inicial que el administrador entrega a cada cajero.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Monto base para vueltos"
                      type="number"
                      value={vueltoConfigForm.montoBase}
                      onChange={(event) => setVueltoConfigForm({ montoBase: Math.max(0, Number(event.target.value) || 0) })}
                      inputProps={{ min: 0, step: '0.10' }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{appConfigForm.moneda || 'S/'}</InputAdornment>
                      }}
                      helperText="Referencia para advertir si una venta requiere demasiado cambio."
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} display="flex" justifyContent="flex-end" gap={1}>
                    <Button variant="outlined" onClick={() => setVueltoConfigForm(loadVueltoConfig())}>
                      Cerrar
                    </Button>
                    <Button variant="contained" onClick={handleSaveVueltoConfig}>
                      Guardar vueltos
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Alert severity="info">
                      El fondo asignado no es venta ni ganancia. Es dinero del administrador que el cajero recibe para iniciar caja y debe devolver al cierre junto con el efectivo cobrado.
                    </Alert>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Cajero"
                      select
                      value={fondoUsuarioId}
                      onChange={(event) => setFondoUsuarioId(String(event.target.value))}
                      fullWidth
                    >
                      {cajeros.map((cajero) => (
                        <MenuItem key={cajero.id} value={String(cajero.id)}>
                          {cajero.nombre_completo || cajero.nombre_usuario}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Fondo entregado"
                      value={fondoMonto}
                      onChange={(event) => setFondoMonto(event.target.value.replace(/[^0-9.]/g, ''))}
                      InputProps={{ startAdornment: <InputAdornment position="start">S/</InputAdornment> }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nota"
                      value={fondoNota}
                      onChange={(event) => setFondoNota(event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} display="flex" justifyContent="flex-end">
                    <Button variant="contained" onClick={handleAsignarFondoCaja} disabled={fondoSaving || cajeros.length === 0}>
                      Asignar fondo
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Cajero</TableCell>
                            <TableCell align="right">Monto</TableCell>
                            <TableCell>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fondosCaja.length === 0 ? (
                            <TableRow><TableCell colSpan={3}>Todavia no hay fondos asignados.</TableCell></TableRow>
                          ) : fondosCaja.slice(0, 8).map((fondo) => (
                            <TableRow key={fondo.id}>
                              <TableCell>{fondo.usuarioNombre}</TableCell>
                              <TableCell align="right">{formatCurrency(fondo.monto)}</TableCell>
                              <TableCell>{fondo.estado}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* DISEÑO: Notificaciones (Snackbar) - Mensajes de éxito/error */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ConfiguracionPage;
