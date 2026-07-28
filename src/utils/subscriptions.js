/** Subscription helpers — renewal dates and sorting. */

const parseIsoDate = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Clamp day-of-month to target month's length (Jan 31 → Feb 28/29). */
const withDayOfMonth = (year, month, anchorDay) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(anchorDay, lastDay));
};

/**
 * Next monthly renewal on or after referenceDate from a start/anchor date.
 * Uses the day-of-month from startDate as the billing anchor.
 */
export const nextRenewalFromStart = (startDate, referenceDate = new Date()) => {
  const start = parseIsoDate(startDate);
  const ref = referenceDate instanceof Date ? referenceDate : parseIsoDate(referenceDate);
  if (!start || !ref) return null;

  const anchorDay = start.getDate();
  const refAtMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

  let candidate = withDayOfMonth(refAtMidnight.getFullYear(), refAtMidnight.getMonth(), anchorDay);
  if (candidate < refAtMidnight) {
    candidate = withDayOfMonth(refAtMidnight.getFullYear(), refAtMidnight.getMonth() + 1, anchorDay);
  }
  return toIsoDate(candidate);
};

/** Resolve startDate from sub (legacy renewalDate → anchor day). */
export const resolveSubscriptionStartDate = (sub) => {
  if (sub?.startDate) return sub.startDate;
  if (sub?.renewalDate) return sub.renewalDate;
  return null;
};

/** Computed next renewal for display and sorting. */
export const resolveSubscriptionRenewal = (sub, referenceDate = new Date()) => {
  const start = resolveSubscriptionStartDate(sub);
  if (!start) return sub?.renewalDate ?? null;
  return nextRenewalFromStart(start, referenceDate);
};

/** Normalize manual subs: legacy renewalDate becomes startDate anchor. */
export const normalizeSubscription = (sub, referenceDate = new Date()) => {
  const startDate = resolveSubscriptionStartDate(sub);
  const renewalDate = startDate ? nextRenewalFromStart(startDate, referenceDate) : sub?.renewalDate ?? null;
  const rest = { ...sub };
  delete rest.renewalDate;
  return {
    ...rest,
    ...(startDate && { startDate }),
    renewalDate,
  };
};

const normName = (name) => String(name || '').trim().toLowerCase();

export const getSubscriptions = (config, transactions = [], referenceDate = new Date()) => {
  const manual = (Array.isArray(config?.SUBSCRIPTIONS) ? config.SUBSCRIPTIONS : []).map((s) =>
    normalizeSubscription(s, referenceDate)
  );
  const derived = deriveSubscriptionsFromTransactions(transactions, referenceDate);
  const manualNames = new Set(manual.map((s) => normName(s.name)));
  return [
    ...manual,
    ...derived.filter((d) => !manualNames.has(normName(d.name))),
  ];
};

/** Build subscription entries from transactions categorized as Subscriptions. */
export const deriveSubscriptionsFromTransactions = (transactions = [], referenceDate = new Date()) => {
  const latestByMerchant = new Map();

  for (const txn of transactions) {
    if (txn.Category !== 'Subscriptions' || !txn.Merchant) continue;
    const key = normName(txn.Merchant);
    const existing = latestByMerchant.get(key);
    if (!existing || String(txn.Date) > String(existing.Date)) {
      latestByMerchant.set(key, txn);
    }
  }

  return [...latestByMerchant.values()].map((txn) => {
    const startDate = txn.Date;
    const renewalDate = nextRenewalFromStart(startDate, referenceDate);
    return {
      id: `txn-sub-${normName(txn.Merchant).replace(/[^a-z0-9]+/g, '-')}`,
      name: txn.Merchant,
      amount: Number(txn.Amount) || 0,
      startDate,
      renewalDate,
      ...(txn.Card && { card: txn.Card }),
      source: 'transaction',
      transactionId: txn.id,
    };
  });
};

export const daysUntilRenewal = (renewalDate, referenceDate = new Date()) => {
  const renew = parseIsoDate(renewalDate);
  if (!renew) return null;
  const today = referenceDate instanceof Date ? referenceDate : parseIsoDate(referenceDate);
  if (!today) return null;
  const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((renew - ref) / 86_400_000);
};

export const formatRenewalLabel = (renewalDate, referenceDate = new Date()) => {
  const days = daysUntilRenewal(renewalDate, referenceDate);
  if (days === null) return 'No renewal date';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Renews today';
  if (days === 1) return 'Renews tomorrow';
  return `Renews in ${days} days`;
};

export const renewalUrgency = (renewalDate, referenceDate = new Date()) => {
  const days = daysUntilRenewal(renewalDate, referenceDate);
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
