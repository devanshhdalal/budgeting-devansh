import { describe, expect, it } from 'vitest';
import {
  deriveSubscriptionsFromTransactions,
  getSubscriptions,
} from './subscriptions.js';

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
    const derived = deriveSubscriptionsFromTransactions(transactions);
    expect(derived).toHaveLength(1);
    expect(derived[0].name).toBe('Tidal');
    expect(derived[0].amount).toBe(6.31);
    expect(derived[0].renewalDate).toBe('2026-07-14');
    expect(derived[0].source).toBe('transaction');
  });

  it('merges manual config subscriptions with transaction-derived ones', () => {
    const config = {
      SUBSCRIPTIONS: [{ id: 'sub-1', name: 'iCloud+', amount: 12.99, renewalDate: '2026-07-11' }],
    };
    const merged = getSubscriptions(config, transactions);
    expect(merged).toHaveLength(2);
    expect(merged.map((s) => s.name)).toEqual(['iCloud+', 'Tidal']);
  });

  it('prefers manual subscription when names match', () => {
    const config = {
      SUBSCRIPTIONS: [{ id: 'sub-1', name: 'Tidal', amount: 9.99, renewalDate: '2026-08-01' }],
    };
    const merged = getSubscriptions(config, transactions);
    expect(merged).toHaveLength(1);
    expect(merged[0].amount).toBe(9.99);
  });
});
