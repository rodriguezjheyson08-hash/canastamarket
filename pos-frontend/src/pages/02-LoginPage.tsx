/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/02-LoginPage.tsx
 * QUE HACE: Contiene la pantalla de inicio de sesion del personal.
 */
import React, { useCallback, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  InputAdornment
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import { LoginData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';

const LoginPage: React.FC = () => {
  const { login: loginStaff } = useAuth();
  const navigate = useNavigate();
  const config = useAppConfig();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goToInitialScreen = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const idValue = identifier.trim();
    if (!idValue || !password) {
      setError(t('Rellena todos los campos.', 'Fill in all fields.'));
      return;
    }

    setLoading(true);
    try {
      const staffPayload: LoginData = { nombreUsuario: idValue, password };
      const result = await loginStaff(staffPayload);
      if (!result.ok) {
        setError(result.message || t('Credenciales inválidas', 'Invalid credentials'));
        return;
      }
      goToInitialScreen();
    } catch (_error) {
      setError(t('Error al iniciar sesión', 'Login error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, rgba(28, 131, 230, 0.92) 0%, rgba(20, 105, 191, 0.92) 100%)',
          borderBottom: '2px solid rgba(144, 224, 255, 0.98)'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 62, sm: 68 }, alignItems: 'center' }}>
          <StorefrontIcon sx={{ mr: 1.5, fontSize: 30 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {config.appName}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 3, md: 4 }
        }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, md: 4 }, width: '100%' }}>
          <Box textAlign="center" mb={3}>
            {config.logo && (
              <Avatar src={config.logo} alt="Logo" sx={{ width: 64, height: 64, mx: 'auto', mb: 1, bgcolor: '#f5f5f5' }} />
            )}
            <Typography variant="h4" component="h1" gutterBottom>
              {config.appName}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {t('Iniciar sesión', 'Sign in')}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label={t('Usuario', 'Username')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              fullWidth
              margin="normal"
              autoFocus
            />
            <TextField
              label={t('Contraseña', 'Password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? t('Ocultar contraseña', 'Hide password') : t('Mostrar contraseña', 'Show password')}
                      onClick={() => setShowPassword((prev) => !prev)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('Iniciar Sesión', 'Sign In')
              )}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
