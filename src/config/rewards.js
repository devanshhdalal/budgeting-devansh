/**
 * Resolve the point/cashback multiplier for a transaction.
 * Looks at per-merchant overrides first, then the card's category multiplier,
 * then the card's "Base" multiplier, then 1.
 */
import { canonicalizeCardName } from '@shared/cardNames';

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
  const key = canonicalizeCardName(cardName);
  if (!key || !amount || !cardsConfig?.[key]) return null;

  const cardConfig = { name: key, ...cardsConfig[key] };
  const { multiplier, note } = resolveMultiplier(cardConfig, category, merchant, overridesConfig);

  const raw = amount * multiplier;
  const points = cardConfig.currency === 'Cashback' ? raw : Math.floor(raw);
  const display =
    cardConfig.currency === 'Cashback' ? `$${raw.toFixed(2)}` : String(Math.floor(raw));

  return { points, display, currency: cardConfig.currency, note };
};
