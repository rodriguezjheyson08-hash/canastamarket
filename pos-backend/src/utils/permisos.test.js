const { normalizePermisos } = require('./permisos');

describe('permisos del backend', () => {
  test('el administrador siempre recibe control total de los modulos', () => {
    expect(normalizePermisos('ADMINISTRADOR', { reportes: false })).toEqual({
      ventas: true,
      productos: true,
      categorias: true,
      proveedores: true,
      reportes: true,
      configuracion: true
    });
  });

  test('incorpora nuevos permisos a usuarios guardados con formato anterior', () => {
    expect(normalizePermisos('CAJERO', JSON.stringify({ ventas: true, productos: true }))).toEqual({
      ventas: true,
      productos: true,
      categorias: true,
      proveedores: true,
      reportes: true,
      configuracion: false
    });
  });
});
