import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useI18n } from '../../hooks/useI18n';

const Footer: React.FC = () => {
  const config = useAppConfig();
  const { t } = useI18n();

  return (
    <Box component="footer" sx={{
      width: '100%',
      py: 2,
      px: 2,
      mt: 'auto',
      backgroundColor: 'primary.main',
      color: 'white',
      textAlign: 'center',
      position: 'relative',
      bottom: 0
    }}>
      <Typography variant="body2">
        © {new Date().getFullYear()} {config.appName}. {t('Todos los derechos reservados.', 'All rights reserved.')}
      </Typography>
      <Typography variant="caption">
        {t('Desarrollado por', 'Developed by')} <Link href="#" color="inherit" underline="hover">JHS</Link>
      </Typography>
    </Box>
  );
};

export default Footer; 
