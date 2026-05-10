/**
 * Rewards Configuration
 * Easily edit the multipliers and point currencies here.
 * 
 * Multipliers are applied based on the Category of the transaction.
 * If a category isn't specified, the 'Base' multiplier is used.
 */

export const REWARDS_CONFIG = {
  "AMEX Cobalt": {
    currency: "MR Points",
    multipliers: {
      "Food": 5,
      "Groceries": 5,
      "Travel": 2,
      "Car": 2, // Gas
      "Base": 1
    }
  },
  "Scene+ Visa": {
    currency: "Scene+ Points",
    multipliers: {
      "Groceries": 1, // E.g., at Sobeys
      "Food": 1,
      "Base": 1
    }
  },
  "Neo Mastercard": {
    currency: "Cashback",
    multipliers: {
      // Neo is usually % based cashback, but we'll represent it as points/$ equivalent for simplicity
      "Car": 0.01, // 1% cashback on gas
      "Food": 0,
      "Groceries": 0,
      "Base": 0
    }
  }
};

/**
 * Calculates the reward points for a given transaction.
 */
export const calculateRewards = (cardName, category, amount) => {
  if (!cardName || !REWARDS_CONFIG[cardName] || !amount) return null;

  const cardConfig = REWARDS_CONFIG[cardName];
  const multiplier = cardConfig.multipliers[category] !== undefined
    ? cardConfig.multipliers[category]
    : (cardConfig.multipliers["Base"] !== undefined ? cardConfig.multipliers["Base"] : 1);

  let points = amount * multiplier;

  if (cardConfig.currency === "Cashback") {
    points = `$${points.toFixed(2)}`;
  } else {
    points = Math.floor(points);
  }

  return {
    points,
    currency: cardConfig.currency
  };
};
