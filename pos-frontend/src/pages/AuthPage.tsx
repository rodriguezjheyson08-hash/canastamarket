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
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import { LoginData } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';
import { useClienteAuth } from '../contexts/ClienteAuthContext';
import { registerClienteWithGoogle } from '../services/clientes';
import { getErrorMessage } from '../utils/errorMessage';
import { renderGoogleSignInButton } from '../utils/googleIdentity';

const AuthPage: React.FC = () => {
  const { login: loginStaff } = useAuth();
  const navigate = useNavigate();
  const config = useAppConfig();
  const { t } = useI18n();
  const { setCliente, login: loginCliente } = useClienteAuth();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitRef = useRef(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const idValue = identifier.trim();
      const isEmail = idValue.includes('@');

      if (isEmail) {
        const result = await loginCliente({ email: idValue, password });
        if (!result.ok) {
          setError(result.message || t('Credenciales inválidas', 'Invalid credentials'));
          return;
        }
        navigate('/tienda', { replace: true });
        return;
      }

      const staffPayload: LoginData = { nombreUsuario: idValue, password };
      const result = await loginStaff(staffPayload);
      if (!result.ok) {
        setError(result.message || t('Credenciales inválidas', 'Invalid credentials'));
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (_error) {
      setError(t('Error al iniciar sesión', 'Login error'));
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
    setGoogleLoading(true);
    try {
      const res = await registerClienteWithGoogle(credential);
      setCliente(res.cliente, res.token);
      navigate('/tienda', { replace: true });
    } catch (error: unknown) {
      setError(getErrorMessage(error, t('No se pudo iniciar sesión con Google.', 'Could not sign in with Google.')));
    } finally {
      setGoogleLoading(false);
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
              required
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
              disabled={loading || !identifier.trim() || !password}
              sx={{ mt: 3 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('Iniciar Sesión', 'Sign In')
              )}
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          {googleClientId ? (
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center', opacity: googleLoading ? 0.6 : 1 }}>
              <div ref={googleButtonRef} />
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t(
                'Google no está configurado (REACT_APP_GOOGLE_CLIENT_ID).',
                'Google is not configured (REACT_APP_GOOGLE_CLIENT_ID).'
              )}
            </Alert>
          )}

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/clientes/registro')}
            sx={{ mt: 1 }}
          >
            {t('Crear cuenta', 'Create account')}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthPage; 
