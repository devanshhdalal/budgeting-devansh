import { Router } from 'express';
import { validation } from '../errors.js';
import { extractAmount } from '../utils/amount.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildDedupKey, upsertTransaction } from '../storage/transactions.js';
import { getConfig } from '../storage/config.js';
import { parseAmex } from '../utils/parsers/amex.js';
import { parseNeo } from '../utils/parsers/neo.js';
import { parseScotiaEmail } from '../utils/parsers/scotiaEmail.js';
import { normalizePayload } from './transactions.js';

const router = Router();

const PARSERS = {
  amex: parseAmex,
  neo: parseNeo,
  scotia_email: parseScotiaEmail,
  test: parseAmex,
};

const REDACT_CARD_PATTERN = /\b\d{12,19}\b/g;

const redactSensitive = (text) =>
  String(text || '')
    .replace(REDACT_CARD_PATTERN, '[REDACTED]')
    .slice(0, 500);

const resolveCard = (config, cardLast4, source) => {
  const map = config?.CARD_IDENTIFIERS || {};
  if (cardLast4 && map[cardLast4]) return map[cardLast4];
  if (source === 'amex') return 'AMEX (unknown)';
  if (source === 'neo') return 'Neo (unknown)';
  if (source === 'scotia_email') return 'Scene+ Visa';
  return '';
};

const rateBuckets = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const checkRateLimit = (key) => {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + RATE_WINDOW_MS;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count <= RATE_LIMIT;
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { source, raw_text: rawText } = req.body || {};

    if (!source || typeof rawText !== 'string' || !rawText.trim()) {
      throw validation('Send { source, raw_text } with non-empty raw_text');
    }

    if (!PARSERS[source]) {
      throw validation(`Unknown source: ${source}`);
    }

    if (!checkRateLimit(req.userId)) {
      throw validation('Rate limit exceeded. Try again in a minute.');
    }

    const config = await getConfig(req.userId);
    const parsed = PARSERS[source](rawText);
    const isTest = source === 'test';

    let payload;
    if (parsed) {
      const card = resolveCard(config, parsed.cardLast4, source);
      payload = {
        Amount: parsed.isRefund ? -Math.abs(parsed.amount) : Math.abs(parsed.amount),
        Date: parsed.date,
        Merchant: parsed.merchant,
        Card: card,
        IsRefund: parsed.isRefund,
        Source: source,
        IsTest: isTest,
        Currency: parsed.currency || 'CAD',
        ...(parsed.foreignAmount != null && { ForeignAmount: parsed.foreignAmount }),
        ...(parsed.foreignCurrency && { ForeignCurrency: parsed.foreignCurrency }),
        Notes: redactSensitive(rawText),
        DedupKey: buildDedupKey(source, parsed.merchant, parsed.amount, parsed.date),
      };
    } else {
      const fallbackAmount = extractAmount({ raw_text: rawText, Amount: rawText }) ?? 0.01;
      payload = {
        Amount: fallbackAmount,
        Date: new Date().toISOString().split('T')[0],
        Merchant: 'Needs review',
        Category: 'Other',
        Card: resolveCard(config, null, source),
        Source: source,
        IsTest: isTest,
        Notes: `Unparsed: ${redactSensitive(rawText)}`,
        DedupKey: buildDedupKey(source, 'needs-review', fallbackAmount, new Date().toISOString()),
      };
    }

    const normalized = normalizePayload(payload);
    const transaction = await upsertTransaction(req.userId, normalized);

    console.log(
      `[${req.userId}] ingest ${source} ${parsed ? 'parsed' : 'needs-review'} → ${transaction.id}`
    );

    res.json({ success: true, transaction, parsed: Boolean(parsed) });
  })
);

export default router;
