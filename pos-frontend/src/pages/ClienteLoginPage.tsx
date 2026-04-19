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
  Divider,
  Avatar,
  IconButton,
  InputAdornment
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';
import { useClienteAuth } from '../contexts/ClienteAuthContext';
import { checkClientesHealth, CLIENTES_API_URL, registerClienteWithGoogle } from '../services/clientes';
import { getErrorMessage } from '../utils/errorMessage';
import { renderGoogleSignInButton } from '../utils/googleIdentity';

const ClienteLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const config = useAppConfig();
  const { t } = useI18n();
  const { login, setCliente } = useClienteAuth();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitRef = useRef(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await checkClientesHealth();
      if (mounted) setBackendOk(ok);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (!res.ok) {
        setError(res.message || t('No se pudo iniciar sesión', 'Could not sign in'));
        return;
      }
      navigate('/tienda', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential?: string) => {
    setError('');
    if (!credential) {
      setError(t('No se pudo obtener credenciales de Google.', 'Could not obtain Google credentials.'));
      return;
    }
    setLoading(true);
    try {
      const res = await registerClienteWithGoogle(credential);
      setCliente(res.cliente, res.token);
      navigate('/tienda', { replace: true });
    } catch (error: unknown) {
      setError(getErrorMessage(error, t('No se pudo iniciar sesión con Google.', 'Could not sign in with Google.')));
    } finally {
      setLoading(false);
    }
  }, [navigate, setCliente, t]);

  useEffect(() => {
    if (!googleClientId) return;
    if (googleInitRef.current) return;
    if (!googleButtonRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        await renderGoogleSignInButton({
          clientId: googleClientId,
          container: googleButtonRef.current!,
          onCredential: handleGoogleCredential
        });

        if (cancelled) return;
        googleInitRef.current = true;
      } catch (error: unknown) {
        if (cancelled) return;
        setError(getErrorMessage(error, t('No se pudo cargar Google Sign-In.', 'Could not load Google Sign-In.')));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleClientId, handleGoogleCredential, t]);

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
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, flexGrow: 1 }}>
            {config.appName}
          </Typography>
          <Button color="inherit" variant="outlined" onClick={() => navigate('/')}>
            {t('Volver', 'Back')}
          </Button>
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
          <Box textAlign="center" mb={2.5}>
            {config.logo && (
              <Avatar src={config.logo} alt="Logo" sx={{ width: 64, height: 64, mx: 'auto', mb: 1, bgcolor: '#f5f5f5' }} />
            )}
            <Typography variant="h4" component="h1" gutterBottom>
              {t('Iniciar sesión (Cliente)', 'Sign in (Customer)')}
            </Typography>
            {process.env.NODE_ENV !== 'production' && (
              <Typography variant="caption" color="text.secondary" display="block">
                API: {CLIENTES_API_URL}
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {backendOk === false && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t(
                `El backend de clientes no está respondiendo. Verifica: ${CLIENTES_API_URL}/clientes/health`,
                'Customer backend not responding. Check: http://localhost:8083/api/clientes/health'
              )}
            </Alert>
          )}

          {googleClientId ? (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <div ref={googleButtonRef} />
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t(
                'Para habilitar Google debes configurar REACT_APP_GOOGLE_CLIENT_ID en el frontend y GOOGLE_CLIENT_ID en el backend.',
                'To enable Google set REACT_APP_GOOGLE_CLIENT_ID (frontend) and GOOGLE_CLIENT_ID (backend).'
              )}
            </Alert>
          )}

          <Divider sx={{ my: 2 }}>{t('o', 'or')}</Divider>

          <form onSubmit={handleSubmit}>
            <TextField
              label={t('Correo', 'Email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              type="email"
              autoFocus
            />
            <TextField
              label={t('Contraseña', 'Password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
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
              disabled={loading || !email || !password}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('Ingresar', 'Sign in')}
            </Button>
          </form>

          <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={() => navigate('/clientes/registro')}>
            {t('Crear cuenta', 'Create account')}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ClienteLoginPage;
