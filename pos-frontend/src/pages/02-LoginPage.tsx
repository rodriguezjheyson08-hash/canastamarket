/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/02-LoginPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Divider,
  IconButton,
  InputAdornment
} from '@mui/material';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import { LoginData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';

// CONSTANTE: GOOGLE_SCRIPT_ID guarda configuracion o valor fijo del archivo.
const GOOGLE_SCRIPT_ID = 'google-identity-services';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
  const { login: loginStaff, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const config = useAppConfig();
  const { t } = useI18n();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const goToInitialScreen = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleGoogleResponse = useCallback(async (response: GoogleCredentialResponse) => {
    const credential = response?.credential;
    if (!credential) {
      setError(t('Continúa con un correo válido.', 'Continue with a valid email.'));
      return;
    }

    setError('');
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (!result.ok) {
        setError(result.message || t('Continúa con un correo válido.', 'Continue with a valid email.'));
        return;
      }
      goToInitialScreen();
    } catch {
      setError(t('Continúa con un correo válido.', 'Continue with a valid email.'));
    } finally {
      setGoogleLoading(false);
    }
  }, [goToInitialScreen, loginWithGoogle, t]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;

// LOGICA: render Google Button concentra una operacion de este archivo.
    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(360, googleButtonRef.current.clientWidth || 360),
        locale: 'es'
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
        window.google?.accounts?.id.cancel();
      };
    }

    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        if (!cancelled) {
          setError(t('No se pudo cargar Google. Continúa con un correo válido.', 'Google could not be loaded. Continue with a valid email.'));
        }
      };
      document.body.appendChild(script);
    }

    script.addEventListener('load', renderGoogleButton);

    return () => {
      cancelled = true;
      script?.removeEventListener('load', renderGoogleButton);
      window.google?.accounts?.id.cancel();
    };
  }, [googleClientId, handleGoogleResponse, t]);

// LOGICA: handle Submit concentra una operacion de este archivo.
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const idValue = identifier.trim();
    if (!idValue || !password) {
      setError(t('Rellena todos los campos.', 'Fill in all fields.'));
      return;
    }

    if (idValue.includes('@') && !EMAIL_REGEX.test(idValue)) {
      setError(t('Ingresa un correo válido.', 'Enter a valid email.'));
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
              label={t('Usuario o correo', 'Username or email')}
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
              disabled={loading || googleLoading}
              sx={{ mt: 3 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('Iniciar Sesión', 'Sign In')
              )}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>{t('o', 'or')}</Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}>
            {googleClientId ? (
              <Box
                ref={googleButtonRef}
                sx={{
                  width: '100%',
                  maxWidth: 360,
                  display: 'flex',
                  justifyContent: 'center',
                  opacity: googleLoading || loading ? 0.65 : 1,
                  pointerEvents: googleLoading || loading ? 'none' : 'auto'
                }}
              />
            ) : (
              <Button
                variant="outlined"
                fullWidth
                disabled
                sx={{ maxWidth: 360 }}
              >
                {t('Google no configurado', 'Google is not configured')}
              </Button>
            )}
          </Box>
          {googleLoading && (
            <Box display="flex" justifyContent="center" mt={2}>
              <CircularProgress size={22} />
            </Box>
          )}

        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
