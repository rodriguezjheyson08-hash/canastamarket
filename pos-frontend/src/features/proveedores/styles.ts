/*
 * MAPA DEL ARCHIVO: DISEÑO FRONTEND
 * UBICACION: pos-frontend/src/features/proveedores/styles.ts
 * QUE HACE: Estilos del modulo para Material UI usando sx.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { SxProps, Theme } from '@mui/material';

// DISEÑO: separa los estilos visuales del modulo Proveedores.
// La pagina importa estos objetos para no mezclar medidas, espacios y colores con la logica.

export const proveedoresPageContainerStyles: SxProps<Theme> = {
  mt: 4,
  mb: 4
};

export const proveedoresHeaderStyles: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 2
};

export const proveedoresHeaderActionsStyles: SxProps<Theme> = {
  display: 'flex',
  gap: 1
};

export const proveedoresTabsPaperStyles: SxProps<Theme> = {
  mb: 2
};

export const proveedoresSearchPaperStyles: SxProps<Theme> = {
  p: 2,
  mb: 2
};

export const proveedoresEmptyStateStyles: SxProps<Theme> = {
  p: 4,
  textAlign: 'center'
};

export const proveedorContactIconButtonStyles: SxProps<Theme> = {
  p: 0.75,
  mx: 0.25
};

// DISEÑO: proveedor Contact Icon Image Styles controla estilos visuales que se aplican con sx.
export const proveedorContactIconImageStyles = (disabled: boolean): SxProps<Theme> => ({
  width: 20,
  height: 20,
  display: 'block',
  opacity: disabled ? 0.35 : 1,
  filter: disabled ? 'grayscale(1)' : 'none'
});

export const pedidosInfoBoxStyles: SxProps<Theme> = {
  mt: 2
};

export const proveedorFormGridStyles: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  gap: 2,
  mt: 1
};

export const proveedorFormWarningStyles: SxProps<Theme> = {
  mt: 2
};

