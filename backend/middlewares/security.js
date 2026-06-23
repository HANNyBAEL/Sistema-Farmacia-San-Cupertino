const FIVE_MINUTES = 5 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

const attempts = new Map();

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' https://www.google.com https://www.gstatic.com",
  "frame-src https://www.google.com",
  "connect-src 'self' https://www.google.com https://www.gstatic.com",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "upgrade-insecure-requests",
];

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.removeHeader('X-Powered-By');
  next();
}

export function noStoreApiCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

export function createRateLimiter({
  windowMs = FIFTEEN_MINUTES,
  max = 20,
  message = 'Demasiados intentos. Intenta nuevamente mas tarde.',
} = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${getClientIp(req)}:${req.originalUrl}`;
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of attempts.entries()) {
    if (value.resetAt <= now) attempts.delete(key);
  }
}, FIVE_MINUTES).unref();
