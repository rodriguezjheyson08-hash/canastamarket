export const normalizeWhatsappPhone = (raw: string, defaultCountryCode = '51'): string | null => {
  const input = String(raw || '').trim();
  if (!input) return null;
  const hasPlus = input.startsWith('+');
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;

  // Si viene con +, asumimos que ya trae código país.
  if (hasPlus) return digits;

  // Si no tiene + y parece un número local (Perú: 9 dígitos), antepone +51.
  if (digits.length === 9 && defaultCountryCode) return `${defaultCountryCode}${digits}`;

  // Si ya parece internacional, úsalo tal cual (sin +).
  return digits;
};

export const buildWhatsAppUrl = (rawPhone: string | null | undefined, message: string): string => {
  const phone = normalizeWhatsappPhone(String(rawPhone || ''));
  const text = encodeURIComponent(String(message || '').trim());
  if (!phone) return '';
  // wa.me requiere phone sin signos.
  return `https://wa.me/${encodeURIComponent(phone)}?text=${text}`;
};

export const buildGmailComposeUrl = (to: string | null | undefined, subject: string, body: string): string => {
  const email = String(to || '').trim();
  const qs = new URLSearchParams();
  if (email) qs.set('to', email);
  if (subject) qs.set('su', subject);
  if (body) qs.set('body', body);
  return `https://mail.google.com/mail/?view=cm&fs=1&${qs.toString()}`;
};

