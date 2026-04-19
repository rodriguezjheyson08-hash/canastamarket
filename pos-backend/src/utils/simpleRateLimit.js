const buckets = new Map();

const cleanupExpiredHits = (entry, now, windowMs) => {
  entry.hits = entry.hits.filter((value) => now - value < windowMs);
};

const getClientKey = (req, prefix) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
  return `${prefix}:${ip}`;
};

const createSimpleRateLimit = ({ windowMs = 10 * 60 * 1000, max = 10, keyPrefix = 'default' } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req, keyPrefix);
    const entry = buckets.get(key) || { hits: [] };

    cleanupExpiredHits(entry, now, windowMs);
    entry.hits.push(now);
    buckets.set(key, entry);

    if (entry.hits.length > max) {
      const retryAfterMs = Math.max(1000, windowMs - (now - entry.hits[0]));
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.',
        retry_after_seconds: retryAfterSeconds
      });
    }

    next();
  };
};

module.exports = {
  createSimpleRateLimit
};
