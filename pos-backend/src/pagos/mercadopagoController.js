/*
 * MAPA DEL ARCHIVO: PAGOS BACKEND
 * UBICACION: pos-backend/src/pagos/mercadopagoController.js
 * QUE HACE: Logica de pagos e integracion con Mercado Pago.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const axios = require('axios');
const { createPreference, getPayment } = require('./mercadopagoService');

const isAllowedUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') return true;
    // En desarrollo permitimos http solo para localhost.
    const host = parsed.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
};

// LOGICA: map Item concentra una operacion de este archivo.
const mapItem = (item) => ({
  title: item.title || item.nombre || 'Producto',
  quantity: Number(item.quantity || item.cantidad || 1),
  unit_price: Number(item.unit_price ?? item.precioVenta ?? item.precio ?? 0),
  currency_id: item.currency_id || 'PEN'
});

// LOGICA: build Preference Payload concentra una operacion de este archivo.
const buildPreferencePayload = ({ items, backUrls, notificationUrl, externalReference, metadata }) => {
  const sanitizedBackUrls = backUrls && typeof backUrls === 'object'
    ? {
        success: backUrls.success || undefined,
        failure: backUrls.failure || undefined,
        pending: backUrls.pending || undefined
      }
    : null;
  const hasSuccessBackUrl = !!(sanitizedBackUrls && sanitizedBackUrls.success);

  return {
    items,
    ...(sanitizedBackUrls ? { back_urls: sanitizedBackUrls } : {}),
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    ...(externalReference ? { external_reference: String(externalReference) } : {}),
    ...(metadata ? { metadata } : {}),
    ...(hasSuccessBackUrl ? { auto_return: 'approved' } : {})
  };
};

// LOGICA: get Mercado Pago Error Text concentra una operacion de este archivo.
const getMercadoPagoErrorText = (error) => {
  if (!axios.isAxiosError(error)) return '';
  const message = error.response?.data?.message || '';
  const cause = Array.isArray(error.response?.data?.cause)
    ? error.response.data.cause.map((item) => JSON.stringify(item)).join(' ')
    : JSON.stringify(error.response?.data?.cause || '');
  return `${message} ${cause}`.toLowerCase();
};

// LOGICA: should Retry With Minimal Payload concentra una operacion de este archivo.
const shouldRetryWithMinimalPayload = (error) => {
  if (!axios.isAxiosError(error)) return false;
  if ((error.response?.status || 0) !== 400) return false;
  const errorText = getMercadoPagoErrorText(error);
  return (
    errorText.includes('invalid_auto_return') ||
    errorText.includes('auto_return') ||
    errorText.includes('back_url.success') ||
    errorText.includes('back_urls') ||
    errorText.includes('account_money') ||
    errorText.includes('excluded_payment_types') ||
    errorText.includes('payment_methods')
  );
};

// LOGICA: create Mercado Pago Preference concentra una operacion de este archivo.
const createMercadoPagoPreference = async (req, res) => {
  const { items, backUrls, notificationUrl, externalReference, metadata } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Debe enviar items para la preferencia.' });
  }

  const mappedItems = items.map(mapItem).filter((item) => item.quantity > 0 && item.unit_price >= 0);
  if (mappedItems.length === 0) {
    return res.status(400).json({ message: 'Los items enviados no son válidos.' });
  }

  if (backUrls) {
    const { success, failure, pending } = backUrls;
    if ((success && !isAllowedUrl(success)) ||
        (failure && !isAllowedUrl(failure)) ||
        (pending && !isAllowedUrl(pending))) {
      return res.status(400).json({ message: 'Las back_urls deben ser HTTPS (o localhost en modo dev).' });
    }
  }

  if (notificationUrl && !isAllowedUrl(notificationUrl)) {
    return res.status(400).json({ message: 'notification_url debe ser HTTPS (o localhost en modo dev).' });
  }

  const preferencePayload = buildPreferencePayload({
    items: mappedItems,
    backUrls,
    notificationUrl,
    externalReference,
    metadata
  });

  try {
    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      console.log('[MP] createPreference payload:', JSON.stringify(preferencePayload));
    }
    const data = await createPreference(preferencePayload);
    res.json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });
  } catch (error) {
    if (shouldRetryWithMinimalPayload(error)) {
      const minimalPayload = buildPreferencePayload({
        items: mappedItems,
        externalReference
      });
      try {
        if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
          console.warn('[MP] Reintentando preferencia con payload mínimo.');
        }
        const retriedData = await createPreference(minimalPayload);
        return res.json({
          id: retriedData.id,
          init_point: retriedData.init_point,
          sandbox_init_point: retriedData.sandbox_init_point
        });
      } catch (retryError) {
        if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
          console.warn('[MP] Falló el reintento con payload mínimo.');
        }
      }
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Error al crear preferencia en Mercado Pago.';
      return res.status(status).json({
        message,
        details: error.response?.data?.cause || error.response?.data
      });
    }
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || 'Error al crear preferencia.' });
  }
};

// LOGICA: get Mercado Pago Payment concentra una operacion de este archivo.
const getMercadoPagoPayment = async (req, res) => {
  const paymentId = req.params.id;
  if (!paymentId) {
    return res.status(400).json({ message: 'paymentId es obligatorio.' });
  }
  try {
    const data = await getPayment(paymentId);
    res.json({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      transaction_amount: data.transaction_amount,
      currency_id: data.currency_id
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'Error al consultar pago en Mercado Pago.';
      return res.status(status).json({
        message,
        details: error.response?.data?.cause || error.response?.data
      });
    }
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || 'Error al consultar pago.' });
  }
};

// LOGICA: mercado Pago Webhook concentra una operacion de este archivo.
const mercadoPagoWebhook = async (req, res) => {
  // Mercado Pago envía notificaciones con distintos formatos según el tipo.
  // Se responde 200 para evitar reintentos agresivos.
  res.status(200).send();
};

module.exports = {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  mercadoPagoWebhook
};
