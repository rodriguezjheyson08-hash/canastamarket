const env = require('../config/env');

const MIGRATION_KEY = 'repair_imported_dates_20260623';

const SALES_DATES = [
  [1, '2026-02-16 15:41:13'],
  [2, '2026-02-25 17:16:10'],
  [3, '2026-03-14 10:40:00'],
  [4, '2026-03-14 10:41:05'],
  [5, '2026-03-14 10:41:43'],
  [6, '2026-03-14 10:45:55'],
  [7, '2026-03-14 10:49:58'],
  [8, '2026-03-14 11:21:33'],
  [9, '2026-03-14 11:29:28'],
  [10, '2026-03-14 11:31:00'],
  [11, '2026-03-14 13:27:39'],
  [12, '2026-03-14 13:39:49'],
  [13, '2026-03-14 13:51:32'],
  [14, '2026-03-14 13:52:04'],
  [15, '2026-03-14 14:05:50'],
  [16, '2026-03-14 14:06:30'],
  [17, '2026-03-14 14:26:32'],
  [18, '2026-03-26 15:30:37'],
  [19, '2026-03-27 11:35:15'],
  [20, '2026-04-04 09:52:52'],
  [21, '2026-04-09 19:33:25'],
  [22, '2026-04-16 09:28:43'],
  [23, '2026-04-16 10:02:52'],
  [24, '2026-05-04 20:48:23'],
  [25, '2026-05-07 17:16:19'],
  [26, '2026-05-12 01:07:30'],
  [27, '2026-05-15 11:00:15'],
  [28, '2026-05-15 11:39:34'],
  [29, '2026-05-15 11:41:49'],
  [30, '2026-05-18 14:00:25'],
  [31, '2026-05-27 20:46:03'],
  [32, '2026-05-28 18:30:33'],
  [33, '2026-05-28 18:48:20'],
  [34, '2026-05-28 19:46:49'],
  [35, '2026-05-28 20:52:49'],
  [36, '2026-05-28 21:19:18'],
  [37, '2026-06-02 09:45:02'],
  [38, '2026-06-02 11:06:52'],
  [39, '2026-06-02 14:27:33'],
  [40, '2026-06-10 21:46:04'],
  [41, '2026-06-10 21:47:17'],
  [42, '2026-06-10 22:06:23'],
  [43, '2026-06-10 22:22:55'],
  [44, '2026-06-10 22:29:06'],
  [45, '2026-06-10 22:32:27'],
  [46, '2026-06-10 23:03:44'],
  [47, '2026-06-16 00:25:17'],
  [48, '2026-06-16 00:31:19'],
  [49, '2026-06-16 00:33:27'],
  [50, '2026-06-16 00:37:52'],
  [51, '2026-06-16 00:43:09'],
  [52, '2026-06-16 00:51:50'],
  [53, '2026-06-18 10:13:29'],
  [54, '2026-06-18 16:53:53'],
  [55, '2026-06-18 17:10:36'],
  [56, '2026-06-18 20:17:17'],
  [57, '2026-06-18 22:48:45'],
  [58, '2026-06-18 22:59:48'],
  [59, '2026-06-18 23:39:51'],
  [60, '2026-06-20 10:07:09'],
  [61, '2026-06-20 10:09:30']
];

const ONLINE_ORDER_DATES = [
  [1, 'WEB-1781625247155', '2026-06-16 10:54:07'],
  [2, 'WEB-1781667907535', '2026-06-16 22:45:07'],
  [3, 'WEB-1781668129325', '2026-06-16 22:48:50'],
  [4, 'WEB-1781668892562', '2026-06-16 23:01:32'],
  [5, 'WEB-1781674457007', '2026-06-17 00:34:17'],
  [6, 'WEB-1781675644927', '2026-06-17 00:54:06'],
  [7, 'WEB-1781749961369', '2026-06-17 21:32:42'],
  [8, 'WEB-1781753966181', '2026-06-17 22:39:27'],
  [9, 'WEB-1781760037438', '2026-06-18 00:20:38'],
  [10, 'WEB-1781761503648', '2026-06-18 00:45:03'],
  [11, 'WEB-1781761629612', '2026-06-18 00:47:10'],
  [12, 'WEB-1781762352823', '2026-06-18 00:59:13'],
  [13, 'WEB-1781812429640', '2026-06-18 14:53:49'],
  [14, 'WEB-1781814489469', '2026-06-18 15:28:09'],
  [15, 'WEB-1781819203101', '2026-06-18 16:46:44'],
  [16, 'WEB-1781819231229', '2026-06-18 16:47:11'],
  [17, 'WEB-1781967678545', '2026-06-20 10:01:16']
];

const ensureMigrationTable = (connection) =>
  connection.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      migration_key VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      details VARCHAR(255) NULL
    )
  `);

const hasMigrationRun = async (connection) => {
  const [rows] = await connection.query(
    'SELECT migration_key FROM app_migrations WHERE migration_key = ? LIMIT 1',
    [MIGRATION_KEY]
  );
  return rows.length > 0;
};

const backupTables = async (connection) => {
  await connection.query(
    'CREATE TABLE IF NOT EXISTS _codex_backup_dashboard_dates_20260623_ventas AS SELECT * FROM ventas'
  );
  await connection.query(
    'CREATE TABLE IF NOT EXISTS _codex_backup_dashboard_dates_20260623_pedidos_online AS SELECT * FROM pedidos_online'
  );
};

const repairImportedHistoricalDates = async (connection) => {
  if (!env.runtime.hosted) return { skipped: 'local-environment' };

  await ensureMigrationTable(connection);
  if (await hasMigrationRun(connection)) return { skipped: 'already-applied' };

  await backupTables(connection);

  let updatedSales = 0;
  let updatedOnlineOrders = 0;
  await connection.beginTransaction();
  try {
    for (const [id, fecha] of SALES_DATES) {
      const [result] = await connection.execute(
        `UPDATE ventas
            SET fecha = ?
          WHERE id = ?
            AND TIME(fecha) = '20:26:40'
            AND DATE(fecha) = '2026-06-22'`,
        [fecha, id]
      );
      updatedSales += Number(result.affectedRows || 0);
    }

    for (const [id, codigo, fecha] of ONLINE_ORDER_DATES) {
      const [result] = await connection.execute(
        `UPDATE pedidos_online
            SET fecha = ?
          WHERE id = ?
            AND codigo = ?
            AND TIME(fecha) = '20:26:42'
            AND DATE(fecha) = '2026-06-22'`,
        [fecha, id, codigo]
      );
      updatedOnlineOrders += Number(result.affectedRows || 0);
    }

    await connection.execute(
      `INSERT IGNORE INTO app_migrations (migration_key, details)
       VALUES (?, ?)`,
      [MIGRATION_KEY, `ventas=${updatedSales};pedidos_online=${updatedOnlineOrders}`]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return { updatedSales, updatedOnlineOrders };
};

module.exports = {
  repairImportedHistoricalDates
};
