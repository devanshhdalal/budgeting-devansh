import { MAX_BAR_CHART_DAYS } from '../constants';
import { calculateRewards } from '../config/rewards';
import { formatDisplayDate } from './date';

export const buildPieData = (transactions) => {
  const categoryMap = {};
  transactions.forEach((t) => {
    const cat = t.Category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + (t.Amount || 0);
  });
  return Object.keys(categoryMap)
    .map((name) => ({ name, value: categoryMap[name] }))
    .sort((a, b) => b.value - a.value);
};

export const buildBarData = (transactions) => {
  const dateMap = {};
  transactions.forEach((t) => {
    if (!t.Date) return;
    dateMap[t.Date] = (dateMap[t.Date] || 0) + (t.Amount || 0);
  });

  return Object.keys(dateMap)
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(-MAX_BAR_CHART_DAYS)
    .map((isoDate) => ({
      name: formatDisplayDate(isoDate),
      amount: dateMap[isoDate],
    }));
};

export const buildInsights = (filteredTransactions, appConfig) => {
  const topMerchant = Object.entries(
    filteredTransactions.reduce((acc, t) => {
      if (!t.Merchant) return acc;
      acc[t.Merchant] = (acc[t.Merchant] || 0) + (t.Amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const totalRewards = filteredTransactions.reduce((acc, t) => {
    const r = calculateRewards(
      t.Card,
      t.Category,
      t.Amount,
      t.Merchant,
      appConfig?.CARDS,
      appConfig?.MERCHANT_REWARDS_OVERRIDES
    );
    if (!r || typeof r.points !== 'number') return acc;
    const currency = r.currency || 'Points';
    acc[currency] = (acc[currency] || 0) + r.points;
    return acc;
  }, {});

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + (t.Amount || 0), 0);

  return { topMerchant, totalRewards, totalSpent };
};
