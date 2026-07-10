import { internal, isAppError } from '../errors.js';

const isProd = process.env.NODE_ENV === 'production';

// eslint-disable-next-line no-unused-vars -- Express error middleware requires 4 parameters
export const errorHandler = (err, req, res, _next) => {
  const userId = req.userId ?? 'unknown';
  const label = `[${userId}] ${req.method} ${req.path}`;

  if (!isAppError(err)) {
    console.error(`${label} unhandled:`, err);
    const safe = internal();
    return res.status(safe.status).json({
      error: safe.message,
      code: safe.code,
    });
  }

  console.error(`${label} ${err.code}:`, err.message, err.cause ?? '');

  const message = err.expose || !isProd ? err.message : 'Request failed';
  return res.status(err.status).json({ error: message, code: err.code });
};
