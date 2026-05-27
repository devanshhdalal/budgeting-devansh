import { Router } from 'express';
import { cleanMerchant, inferCategory } from '../utils/merchant.js';
import { extractAmount } from '../utils/amount.js';
import { normalizeDate } from '../utils/date.js';
import {
  deleteTransactionById,
  getTransactions,
  upsertTransaction,
} from '../storage/transactions.js';

const router = Router();

const normalizePayload = (body) => {
  const amount = extractAmount(body);
  if (amount === null) {
    return {
      error:
        'Invalid or missing amount. Send JSON with "Amount" (e.g. 17.24 or "$17.24").',
      status: 400,
    };
  }
  if (amount === 0) {
    return {
      error: 'Amount is $0. Check that your Shortcut passes the wallet charge amount as "Amount".',
      status: 400,
    };
  }

  const isoDate = normalizeDate(body.Date);
  if (!isoDate) {
    return { error: 'Invalid or missing date.', status: 400 };
  }

  const merchant = cleanMerchant(body.Merchant);
  let category = body.Category;
  if (!category || category === '' || category === 'Other') {
    category = inferCategory(merchant);
  }

  return {
    payload: {
      ...body,
      Amount: amount,
      Date: isoDate,
      Merchant: merchant,
      Category: category,
    },
  };
};

router.get('/', async (req, res) => {
  const txs = await getTransactions(req.userId);
  res.json(txs);
});

router.post('/', async (req, res) => {
  if (process.env.DEBUG_SHORTCUT === '1') {
    console.log(`[${req.userId}] POST /api/transactions`, JSON.stringify(req.body));
  }

  const normalized = normalizePayload(req.body);
  if (normalized.error) {
    return res.status(normalized.status).json({ error: normalized.error });
  }

  try {
    const transaction = await upsertTransaction(req.userId, normalized.payload);
    res.json({ success: true, transaction });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteTransactionById(req.userId, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

export default router;
