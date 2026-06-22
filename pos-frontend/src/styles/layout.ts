/*
 * MAPA DEL ARCHIVO: DISEÑO GLOBAL FRONTEND
 * UBICACION: pos-frontend/src/styles/layout.ts
 * QUE HACE: Estilos compartidos por varios modulos.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { SxProps, Theme } from '@mui/material';

// DISEÑO GLOBAL: estilos reutilizables en varias pantallas.
// Si el estilo pertenece solo a un modulo, debe ir en src/features/<modulo>/styles.ts.

// DISEÑO GLOBAL: contenedor base de la aplicacion.
export const appShellStyles: SxProps<Theme> = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column'
};

// DISEÑO GLOBAL: texto centrado para pantallas de carga o fallback.
export const centeredFallbackStyles: SxProps<Theme> = {
  padding: 2,
  textAlign: 'center'
};

// DISEÑO GLOBAL: margen estandar para paginas internas.
export const pageContainerStyles: SxProps<Theme> = {
  mt: 4,
  mb: 4
};
