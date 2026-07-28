import { describe, expect, it } from 'vitest';
import {
  CARD_ALIASES,
  canonicalizeCardName,
  cardsMatch,
  normalizeConfigCardNames,
} from './cardNames.js';

describe('cardNames', () => {
  it('maps legacy aliases to CARDS keys', () => {
    expect(canonicalizeCardName('AMEX Cobalt')).toBe('Cobalt');
    expect(canonicalizeCardName('Scene+ Visa')).toBe('Scene+');
    expect(canonicalizeCardName('Neo Mastercard')).toBe('Neo');
    expect(canonicalizeCardName('Cobalt')).toBe('Cobalt');
    expect(canonicalizeCardName('Platinum Card')).toBe('Platinum Card');
  });

  it('matches aliased and canonical names', () => {
    expect(cardsMatch('AMEX Cobalt', 'Cobalt')).toBe(true);
    expect(cardsMatch('Scene+ Visa', 'Scene+')).toBe(true);
    expect(cardsMatch('Neo', 'Cobalt')).toBe(false);
  });

  it('normalizes config billing cycles and rewards overrides', () => {
    const { config, changed } = normalizeConfigCardNames({
      BILLING_CYCLES: {
        'AMEX Cobalt': { type: 'monthly' },
        Cobalt: {
          type: 'statement',
          anchor: { statementStart: '2026-05-11', statementEnd: '2026-06-10', dueDate: '2026-07-01' },
        },
        'Scene+ Visa': { type: 'monthly' },
      },
      MERCHANT_REWARDS_OVERRIDES: {
        Sobeys: { 'Scene+ Visa': { multiplier: 2 } },
      },
      SUBSCRIPTIONS: [{ id: '1', name: 'Tidal', card: 'AMEX Cobalt' }],
      CARD_IDENTIFIERS: { 1007: 'Cobalt' },
    });

    expect(changed).toBe(true);
    expect(config.BILLING_CYCLES.Cobalt.type).toBe('statement');
    expect(config.BILLING_CYCLES['AMEX Cobalt']).toBeUndefined();
    expect(config.BILLING_CYCLES['Scene+'].type).toBe('monthly');
    expect(config.MERCHANT_REWARDS_OVERRIDES.Sobeys['Scene+'].multiplier).toBe(2);
    expect(config.SUBSCRIPTIONS[0].card).toBe('Cobalt');
    expect(Object.keys(CARD_ALIASES).length).toBeGreaterThan(0);
  });
});
