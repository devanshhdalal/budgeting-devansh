/** Subscription helpers — renewal dates and sorting. */

const parseIsoDate = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const addMonths = (iso, months) => {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const normName = (name) => String(name || '').trim().toLowerCase();

export const getSubscriptions = (config, transactions = []) => {
  const manual = Array.isArray(config?.SUBSCRIPTIONS) ? config.SUBSCRIPTIONS : [];
  const derived = deriveSubscriptionsFromTransactions(transactions);
  const manualNames = new Set(manual.map((s) => normName(s.name)));
  return [
    ...manual,
    ...derived.filter((d) => !manualNames.has(normName(d.name))),
  ];
};

/** Build subscription entries from transactions categorized as Subscriptions. */
export const deriveSubscriptionsFromTransactions = (transactions = []) => {
  const latestByMerchant = new Map();

  for (const txn of transactions) {
    if (txn.Category !== 'Subscriptions' || !txn.Merchant) continue;
    const key = normName(txn.Merchant);
    const existing = latestByMerchant.get(key);
    if (!existing || String(txn.Date) > String(existing.Date)) {
      latestByMerchant.set(key, txn);
    }
  }

  return [...latestByMerchant.values()].map((txn) => ({
    id: `txn-sub-${normName(txn.Merchant).replace(/[^a-z0-9]+/g, '-')}`,
    name: txn.Merchant,
    amount: Number(txn.Amount) || 0,
    renewalDate: addMonths(txn.Date, 1),
    ...(txn.Card && { card: txn.Card }),
    source: 'transaction',
    transactionId: txn.id,
  }));
};

export const daysUntilRenewal = (renewalDate) => {
  const renew = parseIsoDate(renewalDate);
  if (!renew) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((renew - today) / 86_400_000);
};

export const formatRenewalLabel = (renewalDate) => {
  const days = daysUntilRenewal(renewalDate);
  if (days === null) return 'No renewal date';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Renews today';
  if (days === 1) return 'Renews tomorrow';
  return `Renews in ${days} days`;
};

export const renewalUrgency = (renewalDate) => {
  const days = daysUntilRenewal(renewalDate);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days <= 3) return 'soon';
  if (days <= 7) return 'upcoming';
  return 'normal';
};

export const sortByRenewal = (subscriptions) =>
  [...subscriptions].sort((a, b) => {
    const da = daysUntilRenewal(a.renewalDate);
    const db = daysUntilRenewal(b.renewalDate);
    if (da === null && db === null) return a.name.localeCompare(b.name);
    if (da === null) return 1;
    if (db === null) return -1;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });

export const subscriptionMonthlyTotal = (subscriptions) =>
  subscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

export const newSubscriptionId = () => `sub-${crypto.randomUUID()}`;
