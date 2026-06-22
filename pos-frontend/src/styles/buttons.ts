/*
 * MAPA DEL ARCHIVO: DISEÑO GLOBAL FRONTEND
 * UBICACION: pos-frontend/src/styles/buttons.ts
 * QUE HACE: Estilos compartidos por varios modulos.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { SxProps, Theme } from '@mui/material';

// DISEÑO GLOBAL: estilos de botones compartidos por varios modulos.
// Si el boton es propio de ventas/proveedores/productos, debe ir en src/features/<modulo>/styles.ts.

// DISEÑO GLOBAL: boton pequeno de icono usado en acciones compactas.
export const smallIconButtonStyles: SxProps<Theme> = {
  p: 0.5,
  ml: 0.5
};

// DISEÑO GLOBAL: separacion vertical para grupos de botones de accion.
export const actionButtonSpacingStyles: SxProps<Theme> = {
  mt: 1
};

// DISEÑO GLOBAL: ancho completo para mensajes Snackbar/Alert.
export const fullWidthSnackbarStyles: SxProps<Theme> = {
  width: '100%'
};
