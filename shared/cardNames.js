/** Canonical card names live in config.CARDS. Legacy aliases collapse here. */
export const CARD_ALIASES = {
  'AMEX Cobalt': 'Cobalt',
  'Scene+ Visa': 'Scene+',
  'Neo Mastercard': 'Neo',
};

/** Map a stored/display card string to the canonical CARDS key when known. */
export const canonicalizeCardName = (name) => {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  return CARD_ALIASES[trimmed] || trimmed;
};

/** True when both names refer to the same card after alias resolution. */
export const cardsMatch = (a, b) => {
  if (a === 'All' || b === 'All') return true;
  return canonicalizeCardName(a) === canonicalizeCardName(b);
};

/**
 * Rewrite config keys that used legacy card labels.
 * Prefers the richer statement-cycle entry when both alias and canonical exist.
 */
export const normalizeConfigCardNames = (config) => {
  if (!config || typeof config !== 'object') return { config, changed: false };

  let changed = false;
  const next = { ...config };

  if (next.BILLING_CYCLES && typeof next.BILLING_CYCLES === 'object') {
    const cycles = {};
    for (const [key, value] of Object.entries(next.BILLING_CYCLES)) {
      const canon = canonicalizeCardName(key);
      if (canon !== key) changed = true;
      const existing = cycles[canon];
      if (!existing) {
        cycles[canon] = value;
      } else if (existing.type === 'monthly' && value?.type === 'statement') {
        cycles[canon] = value;
        changed = true;
      } else if (existing.type === 'statement' && value?.type === 'monthly') {
        // keep statement
      } else {
        cycles[canon] = value;
      }
    }
    next.BILLING_CYCLES = cycles;
  }

  if (next.MERCHANT_REWARDS_OVERRIDES && typeof next.MERCHANT_REWARDS_OVERRIDES === 'object') {
    const overrides = {};
    for (const [merchant, byCard] of Object.entries(next.MERCHANT_REWARDS_OVERRIDES)) {
      const cardMap = {};
      for (const [card, rule] of Object.entries(byCard || {})) {
        const canon = canonicalizeCardName(card);
        if (canon !== card) changed = true;
        cardMap[canon] = rule;
      }
      overrides[merchant] = cardMap;
    }
    next.MERCHANT_REWARDS_OVERRIDES = overrides;
  }

  if (Array.isArray(next.SUBSCRIPTIONS)) {
    next.SUBSCRIPTIONS = next.SUBSCRIPTIONS.map((sub) => {
      if (!sub?.card) return sub;
      const canon = canonicalizeCardName(sub.card);
      if (canon === sub.card) return sub;
      changed = true;
      return { ...sub, card: canon };
    });
  }

  if (next.CARD_IDENTIFIERS && typeof next.CARD_IDENTIFIERS === 'object') {
    const ids = {};
    for (const [last4, card] of Object.entries(next.CARD_IDENTIFIERS)) {
      const canon = canonicalizeCardName(card);
      if (canon !== card) changed = true;
      ids[last4] = canon;
    }
    next.CARD_IDENTIFIERS = ids;
  }

  return { config: changed ? next : config, changed };
};
