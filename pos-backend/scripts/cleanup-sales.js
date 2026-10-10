const fs = require('fs');
const path = require('path');

process.env.ALLOW_REMOTE_DB_IN_DEVELOPMENT = process.env.ALLOW_REMOTE_DB_IN_DEVELOPMENT || 'true';

const pool = require('../src/db/pool');

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--yes');
const resetCaja = args.has('--reset-caja');

const backupDir = path.resolve(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `sales-cleanup-${timestamp}.json`);

const tableExists = async (connection, tableName) => {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
};

const fetchRows = async (connection, sql, params = []) => {
  const [rows] = await connection.query(sql, params);
  return rows;
};

const restoreStockFromSaleMovements = async (connection) => {
  if (!await tableExists(connection, 'inventario_movimientos')) {
    return { productsTouched: 0, source: 'none' };
  }

  const [adjustments] = await connection.query(
    `SELECT producto_id,
            SUM(CASE
                  WHEN tipo = 'VENTA' THEN cantidad
                  WHEN tipo = 'ANULACION_VENTA' THEN -cantidad
                  ELSE 0
                END) AS ajuste
       FROM inventario_movimientos
      WHERE referencia_tipo = 'VENTA'
      GROUP BY producto_id
     HAVING ajuste <> 0`
  );

  for (const row of adjustments) {
    await connection.execute(
      'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
      [Number(row.ajuste), Number(row.producto_id)]
    );
  }

  return { productsTouched: adjustments.length, source: 'inventario_movimientos' };
};

const resetAutoIncrement = async (connection, tableName) => {
  if (await tableExists(connection, tableName)) {
    await connection.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
  }
};

const main = async () => {
  const connection = await pool.getConnection();
  try {
    const [dbRows] = await connection.query('SELECT DATABASE() AS db, @@hostname AS host');
    const target = dbRows[0] || {};

    const backup = {
      createdAt: new Date().toISOString(),
      dryRun: !shouldApply,
      resetCaja,
      target,
      ventas: await fetchRows(connection, 'SELECT * FROM ventas ORDER BY id'),
      venta_detalles: await fetchRows(connection, 'SELECT * FROM venta_detalles ORDER BY id'),
      venta_pagos: await tableExists(connection, 'venta_pagos')
        ? await fetchRows(connection, 'SELECT * FROM venta_pagos ORDER BY id')
        : [],
      inventario_movimientos_venta: await tableExists(connection, 'inventario_movimientos')
        ? await fetchRows(connection, "SELECT * FROM inventario_movimientos WHERE referencia_tipo = 'VENTA' ORDER BY id")
        : [],
      caja_sesiones: await tableExists(connection, 'caja_sesiones')
        ? await fetchRows(connection, 'SELECT * FROM caja_sesiones ORDER BY id')
        : [],
      caja_movimientos_efectivo: await tableExists(connection, 'caja_movimientos_efectivo')
        ? await fetchRows(connection, 'SELECT * FROM caja_movimientos_efectivo ORDER BY id')
        : []
    };

    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    const totals = {
      ventas: backup.ventas.length,
      detalles: backup.venta_detalles.length,
      pagos: backup.venta_pagos.length,
      movimientosVenta: backup.inventario_movimientos_venta.length,
      cajas: backup.caja_sesiones.length,
      movimientosCaja: backup.caja_movimientos_efectivo.length
    };

    if (!shouldApply) {
      console.log(JSON.stringify({
        mode: 'dry-run',
        target,
        backupPath,
        totals,
        hint: 'Run again with --yes to apply. Add --reset-caja only if cash sessions should also be cleared.'
      }, null, 2));
      return;
    }

    await connection.beginTransaction();

    const stockRestore = await restoreStockFromSaleMovements(connection);

    if (await tableExists(connection, 'venta_pagos')) {
      await connection.query('DELETE FROM venta_pagos');
    }
    await connection.query('DELETE FROM venta_detalles');
    if (await tableExists(connection, 'inventario_movimientos')) {
      await connection.query("DELETE FROM inventario_movimientos WHERE referencia_tipo = 'VENTA'");
    }
    await connection.query('DELETE FROM ventas');

    if (resetCaja) {
      if (await tableExists(connection, 'caja_movimientos_efectivo')) {
        await connection.query('DELETE FROM caja_movimientos_efectivo');
      }
      if (await tableExists(connection, 'caja_sesiones')) {
        await connection.query('DELETE FROM caja_sesiones');
      }
      if (await tableExists(connection, 'caja_fondos_asignados')) {
        await connection.query("UPDATE caja_fondos_asignados SET estado = 'PENDIENTE', caja_sesion_id = NULL, usado_at = NULL");
      }
    }

    await resetAutoIncrement(connection, 'ventas');
    await resetAutoIncrement(connection, 'venta_detalles');
    await resetAutoIncrement(connection, 'venta_pagos');
    if (resetCaja) {
      await resetAutoIncrement(connection, 'caja_sesiones');
      await resetAutoIncrement(connection, 'caja_movimientos_efectivo');
    }

    await connection.commit();

    console.log(JSON.stringify({
      mode: 'applied',
      target,
      backupPath,
      totals,
      stockRestore,
      resetCaja
    }, null, 2));
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // Ignore rollback failures so the original error remains visible.
    }
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
};

main();
