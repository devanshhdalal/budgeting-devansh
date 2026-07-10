/** Resolve billing period date range for a card (monthly or custom start-day). */
export const resolveBillingRange = (cardName, referenceDate = new Date(), billingCycles = {}) => {
  const cycle = billingCycles?.[cardName];
  const ref = new Date(referenceDate);

  if (!cycle || cycle.type === 'monthly' || !cycle.startDay) {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    const toIso = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    return { start: toIso(start), end: toIso(end) };
  }

  const startDay = Math.min(Math.max(Number(cycle.startDay) || 1, 1), 28);
  let start = new Date(ref.getFullYear(), ref.getMonth(), startDay);
  if (ref.getDate() < startDay) {
    start = new Date(ref.getFullYear(), ref.getMonth() - 1, startDay);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);

  const toIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return { start: toIso(start), end: toIso(end) };
};
