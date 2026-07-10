export const CARD_NETWORKS = [
  { id: 'amex', label: 'American Express' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'visa', label: 'Visa' },
];

export const CARD_NETWORK_IDS = CARD_NETWORKS.map((n) => n.id);

export const getNetworkLabel = (network) =>
  CARD_NETWORKS.find((n) => n.id === network)?.label ?? network ?? 'Card';

/** Best-effort network guess from legacy card names. */
export const inferNetworkFromName = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('amex') || lower.includes('american express')) return 'amex';
  if (lower.includes('mastercard') || lower.includes('master card')) return 'mastercard';
  if (lower.includes('visa')) return 'visa';
  return '';
};

export const getCardNetwork = (cardConfig, cardName) =>
  cardConfig?.network || inferNetworkFromName(cardName);
