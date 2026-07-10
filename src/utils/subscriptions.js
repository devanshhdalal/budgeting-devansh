/** Subscription helpers — renewal dates and sorting. */

const parseIsoDate = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const getSubscriptions = (config) =>
  Array.isArray(config?.SUBSCRIPTIONS) ? config.SUBSCRIPTIONS : [];

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
