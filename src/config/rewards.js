/**
 * Calculates the reward points for a given transaction.
 */
export const calculateRewards = (cardName, category, amount, merchant, cardsConfig, overridesConfig) => {
  if (!cardName || !cardsConfig || !cardsConfig[cardName] || !amount) return null;

  const cardConfig = cardsConfig[cardName];
  let multiplier = null;
  let rewardNote = null;

  // 1. Check for merchant-specific overrides first
  if (merchant && overridesConfig && overridesConfig[merchant] && overridesConfig[merchant][cardName]) {
    const override = overridesConfig[merchant][cardName];
    multiplier = override.multiplier;
    rewardNote = override.note;
  }

  // 2. Fallback to category multiplier
  if (multiplier === null) {
    multiplier = cardConfig.multipliers[category] !== undefined
      ? cardConfig.multipliers[category]
      : (cardConfig.multipliers["Base"] !== undefined ? cardConfig.multipliers["Base"] : 1);
  }

  let points = amount * multiplier;

  if (cardConfig.currency === "Cashback") {
    points = `$${points.toFixed(2)}`;
  } else {
    points = Math.floor(points);
  }

  return {
    points,
    currency: cardConfig.currency,
    note: rewardNote
  };
};
