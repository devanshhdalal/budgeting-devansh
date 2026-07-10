export class AppError extends Error {
  constructor(message, { code, status, expose = true, cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.expose = expose;
  }
}

export const notFound = (message, opts = {}) =>
  new AppError(message, { code: 'NOT_FOUND', status: 404, ...opts });

export const validation = (message, opts = {}) =>
  new AppError(message, { code: 'VALIDATION', status: 400, ...opts });

export const unauthorized = (message, opts = {}) =>
  new AppError(message, { code: 'UNAUTHORIZED', status: 401, ...opts });

export const storageError = (message, opts = {}) =>
  new AppError(message, { code: 'STORAGE', status: 503, ...opts });

export const conflict = (message, opts = {}) =>
  new AppError(message, { code: 'CONFLICT', status: 409, ...opts });

export const tooManyRequests = (message, opts = {}) =>
  new AppError(message, { code: 'RATE_LIMIT', status: 429, ...opts });

export const internal = (message = 'Internal server error', opts = {}) =>
  new AppError(message, { code: 'INTERNAL', status: 500, expose: false, ...opts });

export const isAppError = (err) => err instanceof AppError;
