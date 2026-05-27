/** Keys Shortcuts / clients may use for the transaction total. */
const AMOUNT_KEYS = [
  'Amount',
  'amount',
  'AMOUNT',
  'Value',
  'value',
  'Total',
  'total',
  'Price',
  'price',
  'TransactionAmount',
  'transactionAmount',
];

/**
 * Parse wallet / Shortcut amount strings: "$17.24", "CAD 17,24", "-12.50", etc.
 */
export const sanitizeAmount = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null;

  let s = String(raw).trim();
  if (!s) return null;

  // Parentheses = negative: (12.34)
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()]/g, '').replace(/^-/, '');

  // Keep digits, comma, dot
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;

  // European decimal: 17,24 (comma + exactly 1–2 digits after)
  if (/^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(',', '.');
  } else {
    // North American thousands: 1,234.56 → strip commas
    s = s.replace(/,/g, '');
  }

  const parsed = parseFloat(s);
  if (Number.isNaN(parsed)) return null;

  return negative ? -Math.abs(parsed) : parsed;
};

/**
 * Find amount on the request body (top-level or one level nested).
 */
export const extractAmount = (body) => {
  if (!body || typeof body !== 'object') return null;

  for (const key of AMOUNT_KEYS) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      const parsed = sanitizeAmount(body[key]);
      if (parsed !== null) return parsed;
    }
  }

  // Nested dictionary from some Shortcut "Get Contents of" flows
  const nested = body.transaction ?? body.Transaction ?? body.data ?? body.payload;
  if (nested && typeof nested === 'object') {
    return extractAmount(nested);
  }

  return null;
};
