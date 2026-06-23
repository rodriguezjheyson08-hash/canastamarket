jest.mock('../config/env', () => ({
  runtime: { hosted: true }
}));

const { repairImportedHistoricalDates } = require('./repairImportedHistoricalDates');

describe('repairImportedHistoricalDates', () => {
  test('respalda con sintaxis TiDB y repara solo el lote importado', async () => {
    const connection = {
      query: jest.fn(async (sql) => {
        if (String(sql).includes('SELECT migration_key')) return [[]];
        return [{}];
      }),
      execute: jest.fn(async () => [{ affectedRows: 1 }]),
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined)
    };

    const result = await repairImportedHistoricalDates(connection);

    const backupSql = connection.query.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(backupSql).toContain('LIKE ventas');
    expect(backupSql).toContain('INSERT IGNORE INTO _codex_backup_dashboard_dates_20260623_v2_ventas');
    expect(backupSql).not.toContain('CREATE TABLE IF NOT EXISTS _codex_backup_dashboard_dates_20260623_v2_ventas AS');
    expect(result).toEqual({ updatedSales: 61, updatedOnlineOrders: 17 });
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
  });
});
