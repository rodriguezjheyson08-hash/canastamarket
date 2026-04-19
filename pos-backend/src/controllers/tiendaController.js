const pool = require('../db/pool');
const { ensureTiendaConfigSchema } = require('../utils/ensureTiendaConfigSchema');

const mapRow = (row) => ({
  appName: row.app_name !== undefined ? row.app_name : null,
  logo: row.logo_url !== undefined ? row.logo_url : null,
  tiendaDireccion: row.direccion !== undefined ? row.direccion : null,
  tiendaLat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
  tiendaLng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
  contactEmail: row.contact_email !== undefined ? row.contact_email : null,
  contactWhatsapp: row.contact_whatsapp !== undefined ? row.contact_whatsapp : null,
  deliveryEnabled: Number(row.delivery_enabled) === 1,
  deliveryBase: Number(row.delivery_base),
  deliveryPerKm: Number(row.delivery_per_km),
  deliveryIncludedKm: Number(row.delivery_included_km),
  deliveryMinFee: Number(row.delivery_min_fee),
  deliverySmallOrderThreshold: Number(row.delivery_small_order_threshold),
  deliverySmallOrderFee: Number(row.delivery_small_order_fee),
  deliveryMaxKm: Number(row.delivery_max_km),
  updatedAt: row.updated_at
});

const toNullableString = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const toNullableNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toNonNegativeNumber = (v, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
};

const toBool = (v, fallback) => {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'si') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return fallback;
};

const validateLatLng = (lat, lng) => {
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
    return { ok: false, message: 'Latitud inválida.' };
  }
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
    return { ok: false, message: 'Longitud inválida.' };
  }
  return { ok: true };
};

const getTiendaConfig = async (_req, res) => {
  await ensureTiendaConfigSchema();
  const [rows] = await pool.query('SELECT * FROM tienda_config WHERE id = 1 LIMIT 1');
  if (!rows || rows.length === 0) {
    return res.json({
      appName: null,
      logo: null,
      tiendaDireccion: null,
      tiendaLat: null,
      tiendaLng: null,
      contactEmail: null,
      contactWhatsapp: null,
      deliveryEnabled: true,
      deliveryBase: 3,
      deliveryPerKm: 1.2,
      deliveryIncludedKm: 1,
      deliveryMinFee: 4,
      deliverySmallOrderThreshold: 30,
      deliverySmallOrderFee: 2,
      deliveryMaxKm: 8,
      updatedAt: null
    });
  }
  return res.json(mapRow(rows[0]));
};

const updateTiendaConfig = async (req, res) => {
  await ensureTiendaConfigSchema();

  const [rows] = await pool.query('SELECT * FROM tienda_config WHERE id = 1 LIMIT 1');
  const current = rows && rows.length > 0 ? rows[0] : null;
  if (!current) {
    await pool.query('INSERT IGNORE INTO tienda_config (id) VALUES (1)');
    const [rows2] = await pool.query('SELECT * FROM tienda_config WHERE id = 1 LIMIT 1');
    if (!rows2 || rows2.length === 0) {
      return res.status(500).json({ message: 'No se pudo inicializar configuración de la tienda.' });
    }
    return updateTiendaConfig(req, res);
  }

  const body = req.body || {};
  const nextAppName =
    body.appName !== undefined ? toNullableString(body.appName) : toNullableString(current.app_name);
  const nextLogo =
    body.logo !== undefined ? toNullableString(body.logo) : toNullableString(current.logo_url);
  const nextDireccion =
    body.tiendaDireccion !== undefined ? toNullableString(body.tiendaDireccion) : toNullableString(current.direccion);

  const nextLat = body.tiendaLat !== undefined ? toNullableNumber(body.tiendaLat) : toNullableNumber(current.lat);
  const nextLng = body.tiendaLng !== undefined ? toNullableNumber(body.tiendaLng) : toNullableNumber(current.lng);

  const nextContactEmail =
    body.contactEmail !== undefined ? toNullableString(body.contactEmail) : toNullableString(current.contact_email);
  const nextContactWhatsapp =
    body.contactWhatsapp !== undefined ? toNullableString(body.contactWhatsapp) : toNullableString(current.contact_whatsapp);

  const latLngCheck = validateLatLng(nextLat, nextLng);
  if (!latLngCheck.ok) {
    return res.status(400).json({ message: latLngCheck.message });
  }

  const nextDeliveryEnabled =
    body.deliveryEnabled !== undefined ? toBool(body.deliveryEnabled, Number(current.delivery_enabled) === 1) : Number(current.delivery_enabled) === 1;

  const nextDeliveryBase =
    body.deliveryBase !== undefined ? toNonNegativeNumber(body.deliveryBase, Number(current.delivery_base)) : Number(current.delivery_base);
  const nextDeliveryPerKm =
    body.deliveryPerKm !== undefined ? toNonNegativeNumber(body.deliveryPerKm, Number(current.delivery_per_km)) : Number(current.delivery_per_km);
  const nextDeliveryIncludedKm =
    body.deliveryIncludedKm !== undefined
      ? toNonNegativeNumber(body.deliveryIncludedKm, Number(current.delivery_included_km))
      : Number(current.delivery_included_km);
  const nextDeliveryMinFee =
    body.deliveryMinFee !== undefined ? toNonNegativeNumber(body.deliveryMinFee, Number(current.delivery_min_fee)) : Number(current.delivery_min_fee);
  const nextThreshold =
    body.deliverySmallOrderThreshold !== undefined
      ? toNonNegativeNumber(body.deliverySmallOrderThreshold, Number(current.delivery_small_order_threshold))
      : Number(current.delivery_small_order_threshold);
  const nextSmallFee =
    body.deliverySmallOrderFee !== undefined
      ? toNonNegativeNumber(body.deliverySmallOrderFee, Number(current.delivery_small_order_fee))
      : Number(current.delivery_small_order_fee);
  const nextMaxKm =
    body.deliveryMaxKm !== undefined ? toNonNegativeNumber(body.deliveryMaxKm, Number(current.delivery_max_km)) : Number(current.delivery_max_km);

  await pool.execute(
    `UPDATE tienda_config SET
      app_name = ?,
      logo_url = ?,
      direccion = ?,
      lat = ?,
      lng = ?,
      contact_email = ?,
      contact_whatsapp = ?,
      delivery_enabled = ?,
      delivery_base = ?,
      delivery_per_km = ?,
      delivery_included_km = ?,
      delivery_min_fee = ?,
      delivery_small_order_threshold = ?,
      delivery_small_order_fee = ?,
      delivery_max_km = ?
     WHERE id = 1`,
    [
      nextAppName,
      nextLogo,
      nextDireccion,
      nextLat,
      nextLng,
      nextContactEmail,
      nextContactWhatsapp,
      nextDeliveryEnabled ? 1 : 0,
      nextDeliveryBase,
      nextDeliveryPerKm,
      nextDeliveryIncludedKm,
      nextDeliveryMinFee,
      nextThreshold,
      nextSmallFee,
      nextMaxKm
    ]
  );

  const [rows3] = await pool.query('SELECT * FROM tienda_config WHERE id = 1 LIMIT 1');
  return res.json(mapRow(rows3[0]));
};

module.exports = {
  getTiendaConfig,
  updateTiendaConfig
};
