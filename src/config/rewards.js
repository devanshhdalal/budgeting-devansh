/**
 * Resolve the point/cashback multiplier for a transaction.
 * Looks at per-merchant overrides first, then the card's category multiplier,
 * then the card's "Base" multiplier, then 1.
 */
const resolveMultiplier = (cardConfig, category, merchant, overridesConfig) => {
  const override = overridesConfig?.[merchant]?.[cardConfig.name];
  if (override) {
    return { multiplier: override.multiplier, note: override.note ?? null };
  }
  const multipliers = cardConfig.multipliers || {};
  const multiplier = multipliers[category] ?? multipliers.Base ?? 1;
  return { multiplier, note: null };
};

export const calculateRewards = (cardName, category, amount, merchant, cardsConfig, overridesConfig) => {
  if (!cardName || !amount || !cardsConfig?.[cardName]) return null;

  const cardConfig = { name: cardName, ...cardsConfig[cardName] };
  const { multiplier, note } = resolveMultiplier(cardConfig, category, merchant, overridesConfig);

  const raw = amount * multiplier;
  const points = cardConfig.currency === 'Cashback' ? `$${raw.toFixed(2)}` : Math.floor(raw);

  return { points, currency: cardConfig.currency, note };
};
