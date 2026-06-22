/*
 * MAPA DEL ARCHIVO: COMPONENTE FRONTEND
 * UBICACION: pos-frontend/src/components/common/BackButton.tsx
 * QUE HACE: Componente reutilizable compartido entre pantallas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// DISEÑO FRONTEND - BOTON VOLVER:
// Componente reutilizable para regresar a la pantalla anterior o a una ruta indicada.
import React from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
// IMPORTACIONES FRONTEND: librerias, helpers y tipos que usa este archivo.
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';
import { smallIconButtonStyles } from '../../styles/buttons';

const BackButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Tooltip title="Regresar">
      <IconButton
        size="small"
        onClick={() => navigate(-1)}
        sx={smallIconButtonStyles}
        color="primary"
      >
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default BackButton; 
