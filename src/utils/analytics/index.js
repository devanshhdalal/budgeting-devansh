import { addDays, daysBetween } from '@shared/billingCycle';
import { calculateRewards } from '@/config/rewards';
import { formatPercent } from '@/utils/chartTheme';

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

/** Every calendar day from start to end inclusive, $0 for gaps. */
export const buildDailySeries = (transactions, { start, end }) => {
  if (!start || !end) return [];

  const dayTotals = groupBy(
    transactions.filter((t) => t.Date >= start && t.Date <= end),
    (t) => t.Date,
    (t) => t.Amount || 0
  );

  const series = [];
  let cursor = start;
  while (cursor && cursor <= end) {
    series.push({
      isoDate: cursor,
      amount: dayTotals.get(cursor) ?? 0,
      name: formatIsoLabel(cursor, SHORT_DATE),
      fullLabel: formatIsoLabel(cursor, FULL_DATE),
    });
    cursor = addDays(cursor, 1);
  }
  return series;
};

export const buildCategoryBreakdown = (transactions) => {
  const totals = groupBy(
    transactions,
    (t) => t.Category || 'Other',
    (t) => t.Amount || 0
  );

  const rows = [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row, index) => ({
    ...row,
    total,
    percent: formatPercent(row.value, total),
    colorIndex: index,
  }));
};

export const buildMerchantRankings = (transactions, limit = 8) => {
  const totals = groupBy(
    transactions.filter((t) => t.Merchant),
    (t) => t.Merchant,
    (t) => t.Amount || 0
  );

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit).map(([name, value]) => ({ name, value }));
  const otherTotal = sorted.slice(limit).reduce((sum, [, v]) => sum + v, 0);

  if (otherTotal > 0) {
    top.push({ name: 'Other', value: otherTotal });
  }
  return top;
};

export const buildCardBreakdown = (transactions) => {
  const totals = groupBy(
    transactions.filter((t) => t.Card),
    (t) => t.Card,
    (t) => t.Amount || 0
  );

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const buildRewardsSeries = (transactions, appConfig, { start, end }) => {
  if (!start || !end) return { series: [], currencies: [] };

  const byDay = new Map();
  const currencies = new Set();

  for (const t of transactions) {
    if (t.Date < start || t.Date > end) continue;
    const reward = calculateRewards(
      t.Card,
      t.Category,
      t.Amount || 0,
      t.Merchant,
      appConfig?.CARDS,
      appConfig?.MERCHANT_REWARDS_OVERRIDES
    );
    if (!reward || typeof reward.points !== 'number') continue;
    const currency = reward.currency || 'Points';
    currencies.add(currency);
    if (!byDay.has(t.Date)) byDay.set(t.Date, {});
    const day = byDay.get(t.Date);
    day[currency] = (day[currency] ?? 0) + reward.points;
  }

  const series = [];
  let cursor = start;
  while (cursor && cursor <= end) {
    const dayRewards = byDay.get(cursor) ?? {};
    series.push({
      isoDate: cursor,
      name: formatIsoLabel(cursor, SHORT_DATE),
      ...dayRewards,
    });
    cursor = addDays(cursor, 1);
  }

  return { series, currencies: [...currencies] };
};

export const buildBudgetVsActual = (transactions, appConfig, { start, end }) => {
  const limits = appConfig?.BUDGET_CONFIG ?? {};
  const spent = groupBy(
    transactions.filter((t) => t.Date >= start && t.Date <= end),
    (t) => t.Category || 'Other',
    (t) => t.Amount || 0
  );

  return (appConfig?.CATEGORIES ?? [])
    .map((cat) => {
      const limit = limits[cat.value] || 0;
      const actual = spent.get(cat.value) ?? 0;
      return {
        category: cat.value,
        label: cat.label,
        limit,
        actual,
      };
    })
    .filter((row) => row.limit > 0 || row.actual > 0);
};

export const buildPeriodComparison = (transactions, { start, end }) => {
  if (!start || !end) {
    return { currentTotal: 0, previousTotal: 0, changePercent: null, dayCount: 0 };
  }

  const dayCount = daysBetween(start, end) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(start, -dayCount);

  let currentTotal = 0;
  let previousTotal = 0;

  for (const t of transactions) {
    const amount = t.Amount || 0;
    if (t.Date >= start && t.Date <= end) currentTotal += amount;
    else if (prevStart && prevEnd && t.Date >= prevStart && t.Date <= prevEnd) {
      previousTotal += amount;
    }
  }

  const changePercent =
    previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  return { currentTotal, previousTotal, changePercent, dayCount };
};

export const buildAnalyticsSummary = (transactions, appConfig, range) => {
  const inRange = transactions.filter(
    (t) => (!range.start || t.Date >= range.start) && (!range.end || t.Date <= range.end)
  );
  const comparison = buildPeriodComparison(transactions, range);
  const rewards = buildRewardsSeries(inRange, appConfig, range);
  const rewardTotals = {};

  for (const row of rewards.series) {
    for (const currency of rewards.currencies) {
      rewardTotals[currency] = (rewardTotals[currency] ?? 0) + (row[currency] ?? 0);
    }
  }

  const avgPerDay =
    comparison.dayCount > 0 ? comparison.currentTotal / comparison.dayCount : 0;

  return {
    totalSpent: comparison.currentTotal,
    avgPerDay,
    changePercent: comparison.changePercent,
    rewardTotals,
    transactionCount: inRange.length,
  };
};

export { buildPieData, buildBarData, buildInsights } from '@/utils/chartData';
