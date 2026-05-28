const AMOUNT_KEYS = new Set([
  'amount',
  'value',
  'total',
  'price',
  'transactionamount',
]);

const NESTED_KEYS = ['transaction', 'Transaction', 'data', 'payload'];

/**
 * Parse wallet / Shortcut amount strings: "$17.24", "CAD 17,24", "-12.50", etc.
 */
export const sanitizeAmount = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null;

  let s = String(raw).trim();
  if (!s) return null;

  const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()]/g, '').replace(/^-/, '').replace(/[^\d.,]/g, '');
  if (!s) return null;

  // European decimal like "17,24" (comma + 1-2 digits); otherwise treat commas as thousands.
  s = /^\d+,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');

  const parsed = parseFloat(s);
  if (Number.isNaN(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
};

const findAmountValue = (body) => {
  for (const [key, value] of Object.entries(body)) {
    if (!AMOUNT_KEYS.has(key.toLowerCase())) continue;
    if (value === undefined || value === null || value === '') continue;
    const parsed = sanitizeAmount(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

/** Find amount on the request body (top-level or nested in transaction/data/payload). */
export const extractAmount = (body) => {
  if (!body || typeof body !== 'object') return null;

  const direct = findAmountValue(body);
  if (direct !== null) return direct;

  for (const key of NESTED_KEYS) {
    const nested = body[key];
    if (nested && typeof nested === 'object') {
      const value = extractAmount(nested);
      if (value !== null) return value;
    }
  }
  return null;
};
