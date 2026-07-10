import { Router } from 'express';
import { cleanMerchant, inferCategory } from '../utils/merchant.js';
import { extractAmount } from '../utils/amount.js';
import { normalizeDate } from '../utils/date.js';
import { validation } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  deleteTransactionById,
  getTransactions,
  upsertTransaction,
} from '../storage/transactions.js';

const router = Router();

const VALID_SOURCES = new Set([
  'manual',
  'shortcut',
  'amex',
  'neo',
  'scotia_email',
  'excel',
  'test',
]);

export const normalizePayload = (body) => {
  const amount = extractAmount(body);
  if (amount === null) {
    throw validation(
      'Invalid or missing amount. Send JSON with "Amount" (e.g. 17.24 or "$17.24").'
    );
  }

  const isRefund = Boolean(body.IsRefund) || amount < 0;
  const signedAmount = isRefund ? -Math.abs(amount) : Math.abs(amount);

  if (signedAmount === 0) {
    throw validation(
      'Amount is $0. Check that your Shortcut passes the wallet charge amount as "Amount".'
    );
  }

  const isoDate = normalizeDate(body.Date);
  if (!isoDate) {
    throw validation('Invalid or missing date.');
  }

  const merchant = cleanMerchant(body.Merchant);
  let category = body.Category;
  const hasExplicitCategory =
    Object.prototype.hasOwnProperty.call(body, 'Category') &&
    category !== '' &&
    category != null;
  if (!hasExplicitCategory) {
    category = inferCategory(merchant);
  }

  const source = VALID_SOURCES.has(body.Source) ? body.Source : 'manual';
  const isTest = source === 'test' || Boolean(body.IsTest);

  return {
    ...body,
    Amount: signedAmount,
    Date: isoDate,
    Merchant: merchant,
    Category: category,
    IsRefund: isRefund,
    Source: source,
    IsTest: isTest,
    Currency: body.Currency || 'CAD',
    ...(body.ForeignAmount != null && { ForeignAmount: body.ForeignAmount }),
    ...(body.ForeignCurrency && { ForeignCurrency: body.ForeignCurrency }),
    ...(body.DedupKey && { DedupKey: body.DedupKey }),
  };
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const txs = await getTransactions(req.userId);
    res.json(txs);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (process.env.DEBUG_INGEST === '1' || process.env.DEBUG_SHORTCUT === '1') {
      console.log(`[${req.userId}] POST /api/transactions`, JSON.stringify(req.body));
    }

    const payload = normalizePayload(req.body);
    const transaction = await upsertTransaction(req.userId, payload);
    res.json({ success: true, transaction });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteTransactionById(req.userId, req.params.id);
    res.json({ success: true });
  })
);

export default router;
