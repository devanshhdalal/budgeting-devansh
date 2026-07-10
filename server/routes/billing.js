import { Router } from 'express';
import { validation } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getConfig } from '../storage/config.js';
import { normalizeDate } from '../utils/date.js';
import { projectBillingPeriods, resolveBillingPeriod } from '../../shared/billingCycle.js';

const router = Router();

router.get(
  '/:cardName/period',
  asyncHandler(async (req, res) => {
    const config = await getConfig(req.userId);
    if (!config) {
      return res.status(404).json({ error: 'Config not found', code: 'NOT_FOUND' });
    }

    const cardName = decodeURIComponent(req.params.cardName);
    if (!config.CARDS?.[cardName]) {
      throw validation(`Unknown card: ${cardName}`);
    }

    const referenceDate = normalizeDate(req.query.date) || normalizeDate(new Date().toISOString());
    const billingCycles = config.BILLING_CYCLES || {};
    const period = resolveBillingPeriod(cardName, referenceDate, billingCycles);

    const count = Math.min(Math.max(parseInt(req.query.count, 10) || 1, 1), 12);
    const upcoming =
      count > 1 ? projectBillingPeriods(cardName, billingCycles, referenceDate, count) : [period];

    res.json({ card: cardName, referenceDate, period, upcoming });
  })
);

export default router;
