/**
 * Rewards Calculation Engine
 * Card config is imported from cards.js (single source of truth).
 */

import { CARDS, MERCHANT_REWARDS_OVERRIDES } from './cards';

// Re-export for backward compatibility
export const REWARDS_CONFIG = CARDS;

/**
 * Calculates the reward points for a given transaction.
 */
export const calculateRewards = (cardName, category, amount, merchant) => {
  if (!cardName || !CARDS[cardName] || !amount) return null;

  const cardConfig = CARDS[cardName];
  let multiplier = null;
  let rewardNote = null;

  // 1. Check for merchant-specific overrides first
  if (merchant && MERCHANT_REWARDS_OVERRIDES[merchant] && MERCHANT_REWARDS_OVERRIDES[merchant][cardName]) {
    const override = MERCHANT_REWARDS_OVERRIDES[merchant][cardName];
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
