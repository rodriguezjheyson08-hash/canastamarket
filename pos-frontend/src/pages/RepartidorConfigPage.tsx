import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { useAuth } from '../contexts/AuthContext';
import { getRepartidorDashboard, updateRepartidorEstado, updateRepartidorPerfil } from '../services/reparto';

const estadoChipColor = (estado?: string | null) => {
  const current = String(estado || '').toLowerCase();
  if (current === 'libre') return 'success' as const;
  if (current === 'ocupado') return 'warning' as const;
  if (current === 'inactivo') return 'default' as const;
  return 'default' as const;
};

const RepartidorConfigPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const repartidorId = user?.id ? Number(user.id) : null;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estadoSaving, setEstadoSaving] = useState(false);
  const [err, setErr] = useState('');
  const [snack, setSnack] = useState('');
  const [perfil, setPerfil] = useState<any | null>(null);
  const [form, setForm] = useState({
    nombreCompleto: '',
    telefono: '',
    motoMatricula: '',
    password: ''
  });

  useEffect(() => {
    const load = async () => {
      if (!repartidorId) return;
      setLoading(true);
      setErr('');
      try {
        const data = await getRepartidorDashboard(repartidorId);
        const repartidor = data?.repartidor || null;
        setPerfil(repartidor);
        setForm({
          nombreCompleto: repartidor?.nombreCompleto || user?.nombreCompleto || '',
          telefono: repartidor?.telefono || user?.telefono || '',
          motoMatricula: repartidor?.motoMatricula || '',
          password: ''
        });
      } catch (e: any) {
        setErr(String(e?.message || 'No se pudo cargar la configuración del repartidor.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [repartidorId, user?.nombreCompleto, user?.telefono]);

  const handleChange = (field: keyof typeof form, value: string) => {
    if (field === 'telefono') {
      setForm((prev) => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 9) }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!repartidorId) return;
    if (!form.nombreCompleto.trim()) {
      setErr('El nombre completo es obligatorio.');
      return;
    }
    if (form.telefono && !/^\d{9}$/.test(form.telefono)) {
      setErr('El teléfono debe tener 9 dígitos.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const updated = await updateRepartidorPerfil(repartidorId, {
        nombreCompleto: form.nombreCompleto.trim(),
        telefono: form.telefono.trim() || null,
        motoMatricula: form.motoMatricula.trim() || null,
        password: form.password.trim() || undefined
      });
      setPerfil(updated);
      setForm((prev) => ({ ...prev, password: '' }));
      updateUser({
        ...user!,
        nombreCompleto: updated.nombreCompleto,
        telefono: updated.telefono || undefined
      });
      setSnack('Perfil actualizado.');
    } catch (e: any) {
      setErr(String(e?.message || 'No se pudo actualizar el perfil.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEstado = async (estado: 'libre' | 'ocupado' | 'inactivo') => {
    if (!repartidorId) return;
    setEstadoSaving(true);
    setErr('');
    try {
      const updated = await updateRepartidorEstado(repartidorId, estado);
      setPerfil(updated);
      setSnack(`Estado actualizado a ${estado}.`);
    } catch (e: any) {
      setErr(String(e?.message || 'No se pudo actualizar el estado.'));
    } finally {
      setEstadoSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={900}>
            Configuración Repartidor
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Ajusta tu perfil, tu estado operativo y tus datos de reparto.
          </Typography>
        </Box>

        {err && <Alert severity="error">{err}</Alert>}
        {loading && <Alert severity="info">Cargando configuración…</Alert>}

        {!loading && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.5} alignItems="flex-start">
                    <Avatar sx={{ width: 68, height: 68, bgcolor: 'primary.main', fontSize: 28 }}>
                      {(perfil?.nombreCompleto || user?.nombreCompleto || user?.nombreUsuario || 'R').charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h6" fontWeight={900}>
                      {perfil?.nombreCompleto || user?.nombreCompleto || user?.nombreUsuario}
                    </Typography>
                    <Chip color={estadoChipColor(perfil?.estado)} label={String(perfil?.estado || 'libre').toUpperCase()} />
                    <Chip size="small" icon={<PhoneIcon />} label={perfil?.telefono || 'Sin teléfono'} variant="outlined" />
                    <Chip size="small" icon={<TwoWheelerOutlinedIcon />} label={perfil?.motoMatricula || 'Sin moto'} variant="outlined" />
                    <Chip size="small" icon={<BadgeOutlinedIcon />} label={perfil?.dni || 'Sin DNI'} variant="outlined" />
                    <Chip
                      size="small"
                      icon={<AccessTimeOutlinedIcon />}
                      label={
                        perfil?.lastSeenAt
                          ? `Última señal ${new Date(perfil.lastSeenAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Sin señal registrada'
                      }
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
                    Mi perfil
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nombre completo"
                        value={form.nombreCompleto}
                        onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Celular"
                        value={form.telefono}
                        onChange={(e) => handleChange('telefono', e.target.value)}
                        inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Moto / placa"
                        value={form.motoMatricula}
                        onChange={(e) => handleChange('motoMatricula', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Nueva clave"
                        type="password"
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
                    <Button
                      startIcon={<SaveOutlinedIcon />}
                      variant="contained"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      Guardar cambios
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
                    Mi estado operativo
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
                    {(['libre', 'ocupado', 'inactivo'] as const).map((estado) => (
                      <Button
                        key={estado}
                        variant={String(perfil?.estado || '').toLowerCase() === estado ? 'contained' : 'outlined'}
                        color={estado === 'inactivo' ? 'inherit' : estado === 'ocupado' ? 'warning' : 'success'}
                        disabled={estadoSaving}
                        onClick={() => void handleEstado(estado)}
                      >
                        {estado.toUpperCase()}
                      </Button>
                    ))}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    El administrador también puede controlar este acceso y tu disponibilidad desde gestión de usuarios.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" icon={<MyLocationIcon />}>
                La ubicación en vivo y las entregas activas se siguen gestionando desde el módulo <b>Reparto</b>.
              </Alert>
            </Grid>
          </Grid>
        )}
      </Stack>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2600}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Container>
  );
};

export default RepartidorConfigPage;
