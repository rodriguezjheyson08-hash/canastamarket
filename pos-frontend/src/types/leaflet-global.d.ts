/*
 * MAPA DEL ARCHIVO: TIPOS GLOBALES FRONTEND
 * UBICACION: pos-frontend/src/types/leaflet-global.d.ts
 * QUE HACE: Declaraciones TypeScript compartidas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// TIPOS GLOBALES FRONTEND - LEAFLET:
// Declara tipos globales para evitar errores TypeScript al usar Leaflet.
// TIPOS FRONTEND - CAMBIOS: aqui se agregan declaraciones globales de mapas si faltan tipos.
export {};

declare global {
  interface Window {
    L?: any;
  }
}

