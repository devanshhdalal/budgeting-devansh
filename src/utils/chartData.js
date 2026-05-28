import { MAX_BAR_CHART_DAYS } from '../constants';
import { calculateRewards } from '../config/rewards';
import { formatPercent } from './chartTheme';

const SHORT_DATE = { month: 'short', day: 'numeric' };
const FULL_DATE = { month: 'short', day: 'numeric', year: 'numeric' };

const formatIsoLabel = (iso, opts) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', opts);

const groupBy = (items, getKey, getValue = (item) => item) => {
  const out = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (key == null) continue;
    out.set(key, (out.get(key) ?? 0) + getValue(item));
  }
  return out;
};

export const buildPieData = (transactions) => {
  const totals = groupBy(
    transactions,
    (t) => t.Category || 'Other',
    (t) => t.Amount || 0
  );

  const rows = [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row) => ({
    ...row,
    total,
    percent: formatPercent(row.value, total),
  }));
};

export const buildBarData = (transactions) => {
  const dayTotals = groupBy(
    transactions,
    (t) => t.Date,
    (t) => t.Amount || 0
  );

  return [...dayTotals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-MAX_BAR_CHART_DAYS)
    .map(([isoDate, amount]) => ({
      isoDate,
      amount,
      name: formatIsoLabel(isoDate, SHORT_DATE),
      fullLabel: formatIsoLabel(isoDate, FULL_DATE),
    }));
};

/** Walk transactions once to build top merchant, totals, and reward totals. */
export const buildInsights = (transactions, appConfig) => {
  const merchantTotals = new Map();
  const rewardTotals = new Map();
  let totalSpent = 0;

  for (const t of transactions) {
    const amount = t.Amount || 0;
    totalSpent += amount;

    if (t.Merchant) {
      merchantTotals.set(t.Merchant, (merchantTotals.get(t.Merchant) ?? 0) + amount);
    }

    const reward = calculateRewards(
      t.Card,
      t.Category,
      amount,
      t.Merchant,
      appConfig?.CARDS,
      appConfig?.MERCHANT_REWARDS_OVERRIDES
    );
    if (reward && typeof reward.points === 'number') {
      const currency = reward.currency || 'Points';
      rewardTotals.set(currency, (rewardTotals.get(currency) ?? 0) + reward.points);
    }
  }

  let topMerchant = null;
  for (const entry of merchantTotals) {
    if (!topMerchant || entry[1] > topMerchant[1]) topMerchant = entry;
  }

  return {
    topMerchant,
    totalSpent,
    totalRewards: Object.fromEntries(rewardTotals),
  };
};
