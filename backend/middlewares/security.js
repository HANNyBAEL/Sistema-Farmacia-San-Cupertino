/** Cabeceras de seguridad y límite de solicitudes en memoria para rutas sensibles. */
const FIVE_MINUTES = 5 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

import helmet from 'helmet';

const attempts = new Map();

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  scriptSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
  scriptSrcAttr: ["'none'"],
  frameSrc: ['https://www.google.com'],
  connectSrc: [
    "'self'",
    'https://farmacia-san-cupertino.onrender.com',
    'https://www.google.com',
    'https://www.gstatic.com',
  ],
  imgSrc: ["'self'", 'data:', 'blob:'],
  styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  styleSrcAttr: ["'unsafe-inline'"],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  upgradeInsecureRequests: [],
};

export const helmetSecurityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives,
  },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

export function securityHeaders(req, res, next) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

export function noStoreApiCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

/** Limita por IP y ruta; las entradas vencidas se eliminan periódicamente. */
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
