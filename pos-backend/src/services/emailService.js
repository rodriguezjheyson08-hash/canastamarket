const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;
const getTransporter = () => {
  if (!env.smtp.user || !env.smtp.pass || !env.smtp.from) {
    const error = new Error('El servicio de correo todavia no esta configurado.');
    error.status = 503;
    throw error;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass }
    });
  }
  return transporter;
};

const sendPasswordResetCode = async ({ to, code }) => getTransporter().sendMail({
  from: env.smtp.from,
  to,
  subject: 'Codigo para restablecer tu contrasena - Canasta Market',
  text: `Tu codigo de recuperacion es ${code}. Vence en 10 minutos. Si no solicitaste el cambio, ignora este mensaje.`,
  html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Restablecer contrasena</h2><p>Usa este codigo de seguridad:</p><div style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f2f5f8;text-align:center">${code}</div><p>Vence en 10 minutos. No compartas este codigo con nadie.</p></div>`
});

const sendPedidoOnlineBoleta = async ({ to, pedido }) => {
  const codigo = pedido?.codigo || `#${pedido?.id || ''}`;
  const total = Number(pedido?.total || 0).toFixed(2);
  const boletaHtml = pedido?.boletaHtml || pedido?.boleta_html || '';
  const clienteNombre = pedido?.cliente?.nombre || pedido?.cliente_nombre || 'cliente';

  if (!to || !boletaHtml) {
    const error = new Error('El pedido no tiene correo o boleta para enviar.');
    error.status = 400;
    throw error;
  }

  return getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: `Boleta electronica ${codigo} - ECOMARKET LA CANASTA`,
    text: `Hola ${clienteNombre}, adjuntamos tu boleta del pedido ${codigo} por S/ ${total}. Gracias por tu compra.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111">
        <h2 style="margin-bottom:4px">ECOMARKET - LA CANASTA</h2>
        <p style="margin-top:0">Gracias por tu compra. Adjuntamos la representacion impresa de tu boleta.</p>
        <div style="border:1px solid #ddd;padding:16px;margin:16px 0;background:#fff">
          ${boletaHtml}
        </div>
        <p style="font-size:12px;color:#555">Pedido ${codigo} - Total S/ ${total}</p>
      </div>
    `
  });
};

module.exports = { sendPasswordResetCode, sendPedidoOnlineBoleta };
