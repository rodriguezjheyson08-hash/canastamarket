/*
 * MAPA DEL ARCHIVO: UI FRONTEND
 * UBICACION: pos-frontend/src/components/ui/skeleton.tsx
 * QUE HACE: Componente visual base reutilizable.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// DISEÑO FRONTEND - SKELETON:
// Componente base para representar carga visual antes de mostrar datos reales.
// DISEÑO FRONTEND - CAMBIOS: aqui se modifica la apariencia del estado skeleton/cargando.
import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = '100%', 
  height = '20px' 
}) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}; 
