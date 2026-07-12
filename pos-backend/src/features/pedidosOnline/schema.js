/*
 * MAPA DEL ARCHIVO: ESQUEMA BACKEND
 * UBICACION: pos-backend/src/features/pedidosOnline/schema.js
 * QUE HACE: Crea las tablas necesarias para pedidos hechos desde la tienda publica.
 * GUIA: BASE DE DATOS define estructura; LOGICA controla que solo se cree una vez.
 */
const pool = require('../../db/pool');

let pedidosOnlineSchemaChecked = false;

// BASE DE DATOS - PEDIDOS ONLINE:
// Tabla cabecera: guarda cliente, estado, pago, entrega, total y boleta generada.
const ensurePedidosOnlineSchema = async (runner = pool) => {
  if (pedidosOnlineSchemaChecked) return;

  await runner.query(`
    CREATE TABLE IF NOT EXISTS pedidos_online (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(40) NOT NULL UNIQUE,
      fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_RECOJO',
      metodo_pago VARCHAR(40) NOT NULL DEFAULT 'RECOJO',
      entrega VARCHAR(40) NOT NULL DEFAULT 'RECOJO_TIENDA',
      cliente_nombre VARCHAR(160) NOT NULL,
      cliente_dni VARCHAR(8) NULL,
      cliente_email VARCHAR(160) NOT NULL,
      cliente_telefono VARCHAR(40) NULL,
      cliente_direccion VARCHAR(255) NULL,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      boleta_html LONGTEXT NULL,
      pago_referencia VARCHAR(120) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await runner.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pedidos_online'
        AND COLUMN_NAME IN (
          'cliente_dni', 'cancelado_por', 'cancelado_at', 'cancelacion_motivo', 'reembolso_estado',
          'pago_recogida_metodo', 'pago_recogida_recibido', 'pago_recogida_vuelto', 'pago_recogida_at'
        )`
  );
  const columnSet = new Set(columns.map((column) => column.COLUMN_NAME));
  if (!columnSet.has('cliente_dni')) {
    await runner.query('ALTER TABLE pedidos_online ADD COLUMN cliente_dni VARCHAR(8) NULL AFTER cliente_nombre');
  }
  if (!columnSet.has('cancelado_por')) {
    await runner.query("ALTER TABLE pedidos_online ADD COLUMN cancelado_por VARCHAR(30) NULL AFTER pago_referencia");
  }
  if (!columnSet.has('cancelado_at')) {
    await runner.query('ALTER TABLE pedidos_online ADD COLUMN cancelado_at TIMESTAMP NULL AFTER cancelado_por');
  }
  if (!columnSet.has('cancelacion_motivo')) {
    await runner.query('ALTER TABLE pedidos_online ADD COLUMN cancelacion_motivo VARCHAR(255) NULL AFTER cancelado_at');
  }
  if (!columnSet.has('reembolso_estado')) {
    await runner.query("ALTER TABLE pedidos_online ADD COLUMN reembolso_estado VARCHAR(40) NULL AFTER cancelacion_motivo");
  }
  if (!columnSet.has('pago_recogida_metodo')) {
    await runner.query("ALTER TABLE pedidos_online ADD COLUMN pago_recogida_metodo VARCHAR(40) NULL AFTER pago_referencia");
  }
  if (!columnSet.has('pago_recogida_recibido')) {
    await runner.query("ALTER TABLE pedidos_online ADD COLUMN pago_recogida_recibido DECIMAL(10,2) NULL AFTER pago_recogida_metodo");
  }
  if (!columnSet.has('pago_recogida_vuelto')) {
    await runner.query("ALTER TABLE pedidos_online ADD COLUMN pago_recogida_vuelto DECIMAL(10,2) NULL AFTER pago_recogida_recibido");
  }
  if (!columnSet.has('pago_recogida_at')) {
    await runner.query("ALTER TABLE pedidos_online ADD COLUMN pago_recogida_at TIMESTAMP NULL AFTER pago_recogida_vuelto");
  }

  // BASE DE DATOS - DETALLE DEL PEDIDO:
  // Guarda cada producto comprado y conserva nombre/precio aunque luego cambie el catalogo.
  await runner.query(`
    CREATE TABLE IF NOT EXISTS pedidos_online_detalles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pedido_id INT NOT NULL,
      producto_id INT NOT NULL,
      producto_nombre VARCHAR(180) NOT NULL,
      cantidad INT NOT NULL,
      precio_unitario DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_pedidos_online_detalles_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedidos_online(id)
        ON DELETE CASCADE,
      INDEX idx_pedidos_online_detalles_pedido (pedido_id),
      INDEX idx_pedidos_online_detalles_producto (producto_id)
    )
  `);

  pedidosOnlineSchemaChecked = true;
};

module.exports = {
  ensurePedidosOnlineSchema
};
