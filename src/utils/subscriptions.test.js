import { describe, expect, it } from 'vitest';
import {
  deriveSubscriptionsFromTransactions,
  getSubscriptions,
  nextRenewalFromStart,
  normalizeSubscription,
} from './subscriptions.js';

const REF = new Date(2026, 6, 10); // Jul 10, 2026

describe('subscriptions', () => {
  const transactions = [
    {
      id: '1',
      Merchant: 'Tidal',
      Amount: 6.31,
      Date: '2026-05-14',
      Category: 'Subscriptions',
      Card: 'AMEX Cobalt',
    },
    {
      id: '2',
      Merchant: 'Tidal',
      Amount: 6.31,
      Date: '2026-06-14',
      Category: 'Subscriptions',
      Card: 'AMEX Cobalt',
    },
    {
      id: '3',
      Merchant: 'Netflix',
      Amount: 18.99,
      Date: '2026-05-01',
      Category: 'Food',
      Card: 'AMEX Cobalt',
    },
  ];

  it('derives subscriptions from categorized transactions', () => {
    const derived = deriveSubscriptionsFromTransactions(transactions, REF);
    expect(derived).toHaveLength(1);
    expect(derived[0].name).toBe('Tidal');
    expect(derived[0].amount).toBe(6.31);
    expect(derived[0].startDate).toBe('2026-06-14');
    expect(derived[0].renewalDate).toBe('2026-07-14');
    expect(derived[0].source).toBe('transaction');
  });

  it('merges manual config subscriptions with transaction-derived ones', () => {
    const config = {
      SUBSCRIPTIONS: [{ id: 'sub-1', name: 'iCloud+', amount: 12.99, startDate: '2026-05-11' }],
    };
    const merged = getSubscriptions(config, transactions, REF);
    expect(merged).toHaveLength(2);
    expect(merged.map((s) => s.name)).toEqual(['iCloud+', 'Tidal']);
  });

  it('prefers manual subscription when names match', () => {
    const config = {
      SUBSCRIPTIONS: [{ id: 'sub-1', name: 'Tidal', amount: 9.99, startDate: '2026-08-01' }],
    };
    const merged = getSubscriptions(config, transactions, REF);
    expect(merged).toHaveLength(1);
    expect(merged[0].amount).toBe(9.99);
  });

  it('nextRenewalFromStart returns same month when day not passed', () => {
    expect(nextRenewalFromStart('2026-05-20', new Date(2026, 6, 10))).toBe('2026-07-20');
  });

  it('nextRenewalFromStart rolls to next month when day passed', () => {
    expect(nextRenewalFromStart('2026-05-20', new Date(2026, 6, 25))).toBe('2026-08-20');
  });

  it('clamps Jan 31 anchor in February', () => {
    expect(nextRenewalFromStart('2026-01-31', new Date(2026, 1, 1))).toBe('2026-02-28');
  });

  it('legacy renewalDate becomes start anchor', () => {
    const normalized = normalizeSubscription(
      { id: '1', name: 'Netflix', amount: 18, renewalDate: '2026-07-27' },
      new Date(2026, 6, 10)
    );
    expect(normalized.startDate).toBe('2026-07-27');
    expect(normalized.renewalDate).toBe('2026-07-27');
  });
});
