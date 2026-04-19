import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
  const fondoUrl = `${process.env.PUBLIC_URL}/images/DIBUJITO.png`;
  const caracteristicas = [
    { icon: <ShoppingCartIcon sx={{ fontSize: 48, color: '#63c9ff' }} />, text: t('Elige, paga y listo en segundos', 'Real-time sales and product management') },
    { icon: <AssessmentIcon sx={{ fontSize: 48, color: '#63c9ff' }} />, text: t('Variedad sin límites', 'Automatic reports and business analytics') },
    { icon: <SportsBarIcon sx={{ fontSize: 48, color: '#63c9ff' }} />, text: t('Refresca tu momento', 'Billiard table control and time-based billing') },
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
          backgroundImage: `linear-gradient(135deg, rgba(5, 18, 32, 0.78) 0%, rgba(10, 40, 68, 0.7) 50%, rgba(8, 27, 44, 0.82) 100%), url("${fondoUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: 1
        }
      }}
    >
      {/* Cabecera */}
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
            onClick={() => navigate('/clientes/registro')}
            sx={{
              mr: 1.25,
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
            {t('Crear cuenta', 'Create account')}
          </Button>
          <Button
            color="inherit"
            variant="outlined"
            onClick={() => navigate('/login')}
            sx={{
              borderColor: '#b7e6ff',
              color: '#ffffff',
              fontWeight: 700,
              '&:hover': {
                borderColor: '#e1f5ff',
                backgroundColor: 'rgba(183, 230, 255, 0.16)'
              }
            }}
          >
            {t('Iniciar sesión', 'Log in')}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Cuerpo principal vertical y ancho, sin cards */}
      <Container
        maxWidth="lg"
        sx={{
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
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
        {/* Bloque de bienvenida */}
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
              'Encuentra todo lo que necesitas en un solo lugar, haz tu pedido de forma rápida y sencilla y disfruta de la mejor variedad de productos sin complicaciones.',
              'Modern, fast, and easy-to-use point of sale system for your liquor store, billiards business, or shop.'
            )}
          </Typography>
        </Box>
        {/* Características principales (solo 3, verticales y centradas) */}
        <Box width="100%" maxWidth={1000} mb={{ xs: 1, md: 2 }}>
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
            {caracteristicas.map((c, i) => (
              <Grid item xs={12} md={4} key={i}>
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
                  <Box>{c.icon}</Box>
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
                    {c.text}
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
