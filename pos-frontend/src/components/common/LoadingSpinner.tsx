/*
 * MAPA DEL ARCHIVO: COMPONENTE FRONTEND
 * UBICACION: pos-frontend/src/components/common/LoadingSpinner.tsx
 * QUE HACE: Componente reutilizable compartido entre pantallas.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// DISEÑO FRONTEND - ESTADO DE CARGA:
// Pieza visual usada cuando una pantalla o accion esta esperando datos.
import React from 'react';

// DISEÑO FRONTEND - LOADING:
// Muestra un circulo girando y, opcionalmente, un mensaje mientras carga una pantalla o accion.
const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{ textAlign: 'center', marginTop: 40 }}>
    <div className="spinner" style={{ margin: '0 auto', width: 40, height: 40, border: '4px solid #1976d2', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    {message && <div style={{ marginTop: 16 }}>{message}</div>}
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default LoadingSpinner; 
