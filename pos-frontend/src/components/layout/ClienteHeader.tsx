import React from 'react';
import { AppBar, Badge, Box, Button, Toolbar, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useClienteAuth } from '../../contexts/ClienteAuthContext';
import { useClienteCart } from '../../contexts/ClienteCartContext';
import { useI18n } from '../../hooks/useI18n';
import { ClienteContactActionBar } from '../common/ContactActionBar';

const ClienteHeader: React.FC = () => {
  const navigate = useNavigate();
  const config = useAppConfig();
  const { logout } = useClienteAuth();
  const { count, clear } = useClienteCart();
  const { t } = useI18n();

  const handleLogout = () => {
    clear();
    logout();
    navigate('/', { replace: true });
  };

  return (
    <>
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
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, lineHeight: 1.2, cursor: 'pointer' }}
          onClick={() => navigate('/tienda')}
        >
          {config.appName}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" onClick={() => navigate('/tienda')}>
          {t('Productos', 'Products')}
        </Button>
        <Button
          color="inherit"
          startIcon={<AccountCircleIcon />}
          onClick={() => navigate('/perfil')}
        >
          {t('Perfil', 'Profile')}
        </Button>
        <Button
          color="inherit"
          startIcon={
            <Badge color="secondary" badgeContent={count} max={99}>
              <ShoppingCartIcon />
            </Badge>
          }
          onClick={() => navigate('/checkout')}
        >
          {t('Carrito', 'Cart')}
        </Button>
        <Button
          color="inherit"
          variant="outlined"
          startIcon={<LogoutIcon />}
          sx={{ ml: 1, borderColor: 'rgba(255,255,255,0.7)' }}
          onClick={handleLogout}
        >
          {t('Salir', 'Sign out')}
        </Button>
      </Toolbar>
    </AppBar>
    <ClienteContactActionBar />
    </>
  );
};

export default ClienteHeader;
