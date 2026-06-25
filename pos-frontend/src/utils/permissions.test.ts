/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/permissions.test.ts
 * QUE HACE: Pruebas unitarias de permisos de usuarios.
 * GUIA: usa comentarios TEST/DATOS/MOCK/HELPER para ubicar rapido donde cambiar algo.
 */
// TEST FRONTEND - PERMISOS:
// Prueba que la normalizacion y validacion de permisos funcione para administrador y cajero.
// TEST FRONTEND - CAMBIOS: aqui se agregan casos cuando cambian reglas de permisos.
import { User } from '../types';
import { canAccess, normalizePermissions } from './permissions';

describe('permisos de usuarios', () => {
  it('da todos los permisos a un administrador aunque reciba permisos parciales', () => {
    const permisos = normalizePermissions('ADMINISTRADOR', {
      ventas: false,
      productos: false
    });

    expect(permisos).toEqual({
      ventas: true,
      productos: true,
      categorias: true,
      proveedores: true,
      reportes: true,
      configuracion: true
    });
  });

  it('usa permisos base de cajero cuando no recibe configuracion personalizada', () => {
    const permisos = normalizePermissions('CAJERO', null);

    expect(permisos).toEqual({
      ventas: true,
      productos: true,
      categorias: true,
      proveedores: true,
      reportes: true,
      configuracion: false
    });
  });

  it('respeta permisos personalizados del cajero', () => {
    const permisos = normalizePermissions('CAJERO', {
      productos: true,
      proveedores: true
    });

    expect(permisos.productos).toBe(true);
    expect(permisos.proveedores).toBe(true);
    expect(permisos.ventas).toBe(true);
    expect(permisos.reportes).toBe(true);
    expect(permisos.configuracion).toBe(false);
  });

  it('canAccess devuelve false si no hay usuario autenticado', () => {
    expect(canAccess(null, 'ventas')).toBe(false);
  });

  it('canAccess valida el permiso solicitado del usuario', () => {
    const user: User = {
      id: 2,
      nombreUsuario: 'caja01',
      nombreCompleto: 'Caja Uno',
      rol: 'CAJERO',
      permisos: {
        ventas: true,
        productos: false,
        categorias: true,
        proveedores: false,
        configuracion: false
      }
    };

    expect(canAccess(user, 'ventas')).toBe(true);
    expect(canAccess(user, 'productos')).toBe(false);
    expect(canAccess(user, 'categorias')).toBe(true);
    expect(canAccess(user, 'reportes')).toBe(true);
  });
});
