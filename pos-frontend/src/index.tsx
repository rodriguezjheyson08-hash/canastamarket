/*
 * MAPA DEL ARCHIVO: ENTRADA FRONTEND
 * UBICACION: pos-frontend/src/index.tsx
 * QUE HACE: Monta React en el navegador y arranca la aplicacion.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// ENTRADA FRONTEND - ARRANQUE REACT:
// Renderiza App dentro del elemento root del HTML.
// ENTRADA FRONTEND - CAMBIOS: aqui se cambia el componente raiz o providers globales.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installStaffSessionSync } from './utils/staffSessionSync';

installStaffSessionSync();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
