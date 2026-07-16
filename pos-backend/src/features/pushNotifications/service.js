/*
 * MAPA DEL ARCHIVO: PUSH NOTIFICATIONS
 * UBICACION: pos-backend/src/features/pushNotifications/service.js
 * QUE HACE: Guarda suscripciones Web Push y avisa pedidos online nuevos a admin/cajero.
 */
const webpush = require('web-push');
const pool = require('../../db/pool');

const DEFAULT_VAPID_PUBLIC_KEY = 'BBCMITbEED2ANN9JFu8QdCyCJITSQkb8MtTe8IA1_0UgDz_8YBZQdNLu99hDbGnSYg4Vjz6ynAoCcw9wxX5NAiI';
const DEFAULT_VAPID_PRIVATE_KEY = '19__EnoYdY3_mbynN1As-FVRcW5BICo2lz3k6YK-x4M';

const VAPID_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;

let schemaReady = false;
let vapidReady = false;

const configureVapid = () => {
  if (vapidReady) return;
  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT || 'mailto:admin@canastamarket.online',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  vapidReady = true;
};

const ensurePushSchema = async (runner = pool) => {
  if (schemaReady) return;
  await runner.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NULL,
      endpoint TEXT NOT NULL,
      endpoint_hash VARCHAR(64) NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent VARCHAR(255) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_push_subscriptions_usuario (usuario_id),
      INDEX idx_push_subscriptions_active (is_active)
    )
  `);
  schemaReady = true;
};

const hashEndpoint = (endpoint) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(endpoint || '')).digest('hex');
};

const getPublicKey = () => VAPID_PUBLIC_KEY;

const saveSubscription = async ({ usuarioId, subscription, userAgent }) => {
  await ensurePushSchema();
  const endpoint = String(subscription?.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const auth = String(subscription?.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) {
    const error = new Error('Suscripcion de notificacion invalida.');
    error.statusCode = 400;
    throw error;
  }

  await pool.execute(
    `INSERT INTO push_subscriptions
      (usuario_id, endpoint, endpoint_hash, p256dh, auth, user_agent, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
      usuario_id = VALUES(usuario_id),
      endpoint = VALUES(endpoint),
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      user_agent = VALUES(user_agent),
      is_active = 1`,
    [
      usuarioId || null,
      endpoint,
      hashEndpoint(endpoint),
      p256dh,
      auth,
      String(userAgent || '').slice(0, 255) || null
    ]
  );
};

const notifyPedidoOnlineCreated = async ({ codigo, total }) => {
  try {
    configureVapid();
    await ensurePushSchema();
    const [rows] = await pool.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE is_active = 1'
    );
    if (!rows.length) return;

    const payload = JSON.stringify({
      title: 'Nuevo pedido online',
      body: `${codigo || 'Pedido web'} - Total S/ ${Number(total || 0).toFixed(2)}`,
      url: '/dashboard/pedidos-online',
      tag: 'ecomarket-pedido-online'
    });

    await Promise.all(rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth }
      };
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        if ([404, 410].includes(Number(error?.statusCode))) {
          await pool.execute('UPDATE push_subscriptions SET is_active = 0 WHERE id = ?', [row.id]);
        }
      }
    }));
  } catch {
    // Nunca debe bloquear la venta/pedido por una notificacion.
  }
};

module.exports = {
  getPublicKey,
  saveSubscription,
  notifyPedidoOnlineCreated
};
