export const MAX_VISIBLE_TRANSACTIONS = 15;
export const MAX_BAR_CHART_DAYS = 10;

export const cacheKeys = (userId) => ({
  transactions: `cache_transactions_${userId}`,
  config: `cache_config_${userId}`,
});
