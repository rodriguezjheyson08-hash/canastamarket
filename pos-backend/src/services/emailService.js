const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;
const getTransporter = () => {
  if (!env.smtp.user || !env.smtp.pass || !env.smtp.from) {
    const error = new Error('El servicio de correo todavía no está configurado.');
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
  subject: 'Código para restablecer tu contraseña - Canasta Market',
  text: `Tu código de recuperación es ${code}. Vence en 10 minutos. Si no solicitaste el cambio, ignora este mensaje.`,
  html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Restablecer contraseña</h2><p>Usa este código de seguridad:</p><div style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f2f5f8;text-align:center">${code}</div><p>Vence en 10 minutos. No compartas este código con nadie.</p></div>`
});

module.exports = { sendPasswordResetCode };
