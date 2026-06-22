/*
 * MAPA DEL ARCHIVO: PANTALLA FRONTEND
 * UBICACION: pos-frontend/src/pages/01-InicioPage.tsx
 * QUE HACE: Contiene estructura visible de una pagina, estados de React y llamadas a servicios.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// PANTALLA FRONTEND - INICIO:
// Renderiza portada inicial, botones principales y acceso al login/dashboard.
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import { useAppConfig } from '../hooks/useAppConfig';
import { useI18n } from '../hooks/useI18n';

const InicioPage: React.FC = () => {
  const navigate = useNavigate();
  const config = useAppConfig();
  const { t } = useI18n();
  const fondoUrl = `${process.env.PUBLIC_URL}/images/FONDO.png`;
  const caracteristicas = [
    {
      icon: <ShoppingCartIcon sx={{ fontSize: 48, color: '#f43838' }} />,
      text: t('Ventas rápidas y sencillas', 'Fast and simple sales')
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 48, color: '#63ff63' }} />,
      text: t('Control de productos y reportes', 'Product control and reports')
    },
    {
      icon: <SportsBarIcon sx={{ fontSize: 48, color: '#fff263' }} />,
      text: t('Refresca tu momento', 'Refresh your moment')
    }
  ];

  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      sx={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#071a2f',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(135deg, rgba(5, 18, 32, 0.84) 0%, rgba(10, 40, 68, 0.74) 52%, rgba(8, 27, 44, 0.88) 100%), url("${fondoUrl}")`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center center, center center',
          backgroundRepeat: 'no-repeat',
          opacity: 1
        }
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          zIndex: 1,
          background: 'linear-gradient(90deg, rgba(28, 131, 230, 0.66) 0%, rgba(20, 105, 191, 0.66) 100%)',
          borderBottom: '2px solid rgba(144, 224, 255, 0.72)',
          backdropFilter: 'blur(4px)'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 62, sm: 68 }, alignItems: 'center' }}>
          <StorefrontIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, lineHeight: 1.2 }}>
            {config.appName}
          </Typography>
          <Button
            color="inherit"
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{
              backgroundColor: 'rgba(183, 230, 255, 0.22)',
              color: '#ffffff',
              fontWeight: 800,
              border: '1px solid rgba(183, 230, 255, 0.65)',
              '&:hover': {
                backgroundColor: 'rgba(183, 230, 255, 0.32)',
                borderColor: 'rgba(225, 245, 255, 0.9)'
              }
            }}
          >
            {t('Iniciar sesión', 'Log in')}
          </Button>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        sx={{
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pt: { xs: 4, md: 7 },
          pb: { xs: 3, md: 4 }
        }}
      >
        <Box
          width="100%"
          sx={{
            px: { xs: 2, md: 5 },
            py: { xs: 4, md: 6 }
          }}
        >
          <Box textAlign="center" mb={{ xs: 5, md: 8 }} width="100%">
            <StorefrontIcon sx={{ fontSize: { xs: 86, md: 120 }, color: '#86d8ff', mb: 2 }} />
            <Typography
              variant="h2"
              gutterBottom
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '3.6rem' },
                textShadow: '0 3px 10px rgba(0, 0, 0, 0.7)'
              }}
            >
              {t('Bienvenido a', 'Welcome to')} {config.appName}
            </Typography>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                color: '#e6f7ff',
                fontSize: { xs: '1.1rem', md: '1.65rem' },
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.65)'
              }}
            >
              {t(
                'Administra tus ventas, productos, categorías y caja desde un solo lugar.',
                'Manage your sales, products, categories, and register from one place.'
              )}
            </Typography>
          </Box>

          <Box width="100%" maxWidth={1000} mx="auto" mb={{ xs: 1, md: 2 }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                mb: 3,
                textAlign: 'center',
                color: '#b8ecff',
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)'
              }}
            >
              {t('Características principales', 'Main features')}
            </Typography>
            <Grid container spacing={2.5} justifyContent="center">
              {caracteristicas.map((caracteristica) => (
                <Grid item xs={12} md={4} key={caracteristica.text}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={1.5}
                    sx={{
                      px: 2,
                      py: 2.5,
                      border: '1px solid rgba(122, 219, 255, 0.85)',
                      borderRadius: 2.5,
                      backgroundColor: 'rgba(8, 29, 50, 0.48)',
                      minHeight: { xs: 'auto', md: 200 }
                    }}
                  >
                    <Box>{caracteristica.icon}</Box>
                    <Typography
                      variant="h6"
                      align="center"
                      sx={{
                        color: '#ffffff',
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.7)',
                        fontSize: { xs: '1.1rem', md: '1.35rem' },
                        lineHeight: 1.35
                      }}
                    >
                      {caracteristica.text}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default InicioPage;
