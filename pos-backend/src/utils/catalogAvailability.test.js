const { productAvailabilitySql } = require('./catalogAvailability');

describe('catalogAvailability', () => {
  test('por defecto excluye productos vencidos para ventas y tienda online', () => {
    const sql = productAvailabilitySql('p', 'c');

    expect(sql).toContain('p.fecha_vencimiento IS NULL');
    expect(sql).toContain('p.fecha_vencimiento >= CURRENT_DATE()');
  });

  test('permite incluir vencidos en gestion de productos', () => {
    const sql = productAvailabilitySql('p', 'c', { includeExpired: true });

    expect(sql).not.toContain('fecha_vencimiento >= CURRENT_DATE()');
  });
});
