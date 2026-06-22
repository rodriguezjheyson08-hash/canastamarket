/*
 * MAPA DEL ARCHIVO: DISEÑO FRONTEND
 * UBICACION: pos-frontend/src/features/ventas/styles.ts
 * QUE HACE: Estilos del modulo para Material UI usando sx.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { SxProps, Theme } from '@mui/material';

// DISEÑO VENTAS: tarjeta de cada producto en el catalogo de ventas.
// Si stockActual es bajo, marca borde naranja para advertir reposicion.
export const productoCardStyles = (stockActual: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  p: 2,
  minHeight: 265,
  height: 'auto',
  minWidth: 0,
  boxShadow: 3,
  border: stockActual < 10 ? '2px solid #ff9800' : undefined
});

// DISEÑO VENTAS: imagen del producto dentro de la tarjeta.
export const productoImagenStyles: SxProps<Theme> = {
  width: 70,
  height: 120,
  objectFit: 'contain',
  borderRadius: 2,
  bgcolor: '#f5f5f5',
  mb: 1
};

// DISEÑO VENTAS: nombre del producto, centrado y con salto de linea si es largo.
export const productoNombreStyles: SxProps<Theme> = {
  width: '100%',
  textAlign: 'center',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  lineHeight: 1.2
};

// DISEÑO VENTAS: descripcion del producto, recortada visualmente para no romper la tarjeta.
export const productoDescripcionStyles: SxProps<Theme> = {
  mb: 1,
  whiteSpace: 'normal',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minHeight: 20
};

// DISEÑO VENTAS: panel lateral del carrito donde se agregan productos.
export const carritoPanelStyles: SxProps<Theme> = {
  p: 3,
  borderRadius: 2,
  boxShadow: 3,
  bgcolor: 'background.paper',
  minHeight: 400,
  display: 'flex',
  flexDirection: 'column'
};

// DISEÑO VENTAS: lista interna del carrito con scroll cuando hay muchos items.
export const carritoListaStyles: SxProps<Theme> = {
  flexGrow: 1,
  maxHeight: 350,
  overflowY: 'auto'
};

// DISEÑO VENTAS: contenedor blanco de la boleta/recibo impreso.
export const boletaRootStyles: SxProps<Theme> = {
  width: '100%',
  maxWidth: 760,
  mx: 'auto',
  p: { xs: 1.5, sm: 3 },
  bgcolor: '#fff',
  color: '#111',
  fontFamily: 'Arial, Helvetica, sans-serif',
  border: '1px solid #d0d0d0'
};
