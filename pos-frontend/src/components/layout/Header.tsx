/*
 * MAPA DEL ARCHIVO: LAYOUT FRONTEND
 * UBICACION: pos-frontend/src/components/layout/Header.tsx
 * QUE HACE: Contiene piezas visuales compartidas del marco de la app como header o footer.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Avatar } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../common/BackButton';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useI18n } from '../../hooks/useI18n';

export const PEDIDOS_ONLINE_UPDATE_EVENT = 'pedidos-online-update';

// TIPOS FRONTEND: props/datos HeaderProps usados por este componente.
interface HeaderProps {
  showBack?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showBack }) => {
  const { user, logout } = useAuth();
  const config = useAppConfig();
  const { t } = useI18n();

  return (
    <AppBar position="sticky" color="primary" elevation={2} sx={{ zIndex: 1201 }}>
      <Toolbar>
        {showBack && <BackButton />}
        <StorefrontIcon sx={{ mx: 1, fontSize: 32 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {config.appName}
        </Typography>
        {user && (
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user.nombreCompleto?.charAt(0) || user.nombreUsuario.charAt(0)}
            </Avatar>
            <Box textAlign="right">
              <Typography variant="body2" fontWeight="bold">
                {user.nombreCompleto || user.nombreUsuario}
              </Typography>
            </Box>
            <Button color="inherit" variant="outlined" size="small" onClick={logout} sx={{ ml: 2 }}>
              {t('Cerrar sesión', 'Log out')}
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header; 
