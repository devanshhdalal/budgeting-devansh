import { describe, expect, it } from 'vitest';
import {
  buildDailySeries,
  buildCategoryBreakdown,
  buildMerchantRankings,
  buildPeriodComparison,
} from './index.js';

describe('analytics', () => {
  const transactions = [
    { Date: '2026-07-01', Amount: 50, Category: 'Food', Merchant: 'Metro', Card: 'AMEX Cobalt' },
    { Date: '2026-07-03', Amount: 30, Category: 'Food', Merchant: 'Sobeys', Card: 'AMEX Cobalt' },
    { Date: '2026-06-28', Amount: 100, Category: 'Groceries', Merchant: 'Costco', Card: 'AMEX Cobalt' },
  ];

  it('buildDailySeries fills zero days', () => {
    const series = buildDailySeries(transactions, { start: '2026-07-01', end: '2026-07-05' });
    expect(series).toHaveLength(5);
    expect(series.find((d) => d.isoDate === '2026-07-02')?.amount).toBe(0);
    expect(series.find((d) => d.isoDate === '2026-07-01')?.amount).toBe(50);
  });

  it('buildCategoryBreakdown ranks categories', () => {
    const rows = buildCategoryBreakdown(transactions.filter((t) => t.Date >= '2026-07-01'));
    expect(rows[0].name).toBe('Food');
    expect(rows[0].value).toBe(80);
  });

  it('buildMerchantRankings rolls up Other', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      Merchant: `Shop ${i}`,
      Amount: 10 - i,
      Date: '2026-07-01',
    }));
    const rows = buildMerchantRankings(many, 3);
    expect(rows).toHaveLength(4);
    expect(rows.at(-1).name).toBe('Other');
  });

  it('buildPeriodComparison computes change', () => {
    const cmp = buildPeriodComparison(transactions, { start: '2026-07-01', end: '2026-07-05' });
    expect(cmp.currentTotal).toBe(80);
    expect(cmp.previousTotal).toBe(100);
    expect(cmp.changePercent).toBe(-20);
  });
});
