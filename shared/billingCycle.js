const DAY_MS = 86_400_000;

/** @param {string} iso */
export const parseIsoDate = (iso) => {
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

/** @param {Date} date */
export const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Inclusive day count between two YYYY-MM-DD values. */
export const daysBetween = (startIso, endIso) => {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
};

/** @param {string} iso @param {number} days */
export const addDays = (iso, days) => {
  const date = parseIsoDate(iso);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

/** Move by calendar months while keeping the anchor close day (clamped to month length). */
const addMonthsClamped = (date, months, anchorDay) => {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, lastDay));
  return next;
};

const normalizeReference = (referenceDate) => {
  if (referenceDate instanceof Date) return referenceDate;
  return parseIsoDate(referenceDate) || new Date();
};

const resolveCalendarMonth = (referenceDate) => {
  const ref = normalizeReference(referenceDate);
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { start: toIsoDate(start), end: toIsoDate(end), due: null };
};

/** Legacy: billing period that resets on a fixed day of each month (1–28). */
const resolveCustomStartDay = (referenceDate, startDay) => {
  const ref = normalizeReference(referenceDate);
  const day = Math.min(Math.max(Number(startDay) || 1, 1), 28);
  let start = new Date(ref.getFullYear(), ref.getMonth(), day);
  if (ref.getDate() < day) {
    start = new Date(ref.getFullYear(), ref.getMonth() - 1, day);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1);
  return { start: toIsoDate(start), end: toIsoDate(end), due: null };
};

const isMonthlyCadence = (periodDays) => periodDays >= 28 && periodDays <= 31;

const buildMonthlyPeriod = (endDate, closeDay, dueOffsetDays) => {
  const prevClose = addMonthsClamped(endDate, -1, closeDay);
  const start = addDays(toIsoDate(prevClose), 1);
  const end = toIsoDate(endDate);
  const due = addDays(end, dueOffsetDays);
  return { start, end, due };
};

/** Monthly statement periods derived from one anchor close day. */
const resolveMonthlyStatement = (anchor, referenceDate) => {
  const ref = normalizeReference(referenceDate);
  const refIso = toIsoDate(ref);
  const closeDay = parseIsoDate(anchor.statementEnd).getDate();
  const dueOffsetDays = daysBetween(anchor.statementEnd, anchor.dueDate);

  const lastDayThisMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  let end = new Date(ref.getFullYear(), ref.getMonth(), Math.min(closeDay, lastDayThisMonth));

  let period = buildMonthlyPeriod(end, closeDay, dueOffsetDays);
  if (refIso < period.start) {
    end = addMonthsClamped(end, -1, closeDay);
    period = buildMonthlyPeriod(end, closeDay, dueOffsetDays);
  } else if (refIso > period.end) {
    end = addMonthsClamped(end, 1, closeDay);
    period = buildMonthlyPeriod(end, closeDay, dueOffsetDays);
  }

  return period;
};

/** Fixed-length periods (weekly, biweekly, etc.) slide forward from the anchor. */
const resolveFixedStatement = (anchor, referenceDate) => {
  const refIso = toIsoDate(normalizeReference(referenceDate));
  const periodDays = daysBetween(anchor.statementStart, anchor.statementEnd) + 1;
  const dueOffsetDays = daysBetween(anchor.statementEnd, anchor.dueDate);

  let start = anchor.statementStart;
  let end = anchor.statementEnd;

  while (refIso > end) {
    start = addDays(start, periodDays);
    end = addDays(end, periodDays);
  }
  while (refIso < start) {
    start = addDays(start, -periodDays);
    end = addDays(end, -periodDays);
  }

  return { start, end, due: addDays(end, dueOffsetDays) };
};

const resolveStatementPeriod = (cycle, referenceDate) => {
  const anchor = cycle.anchor;
  if (!anchor?.statementStart || !anchor?.statementEnd || !anchor?.dueDate) {
    return resolveCalendarMonth(referenceDate);
  }

  const periodDays = daysBetween(anchor.statementStart, anchor.statementEnd) + 1;
  if (isMonthlyCadence(periodDays)) {
    return resolveMonthlyStatement(anchor, referenceDate);
  }
  return resolveFixedStatement(anchor, referenceDate);
};

/**
 * Resolve the billing period for a card on a reference date.
 * @returns {{ start: string, end: string, due: string|null }}
 */
export const resolveBillingPeriod = (cardName, referenceDate = new Date(), billingCycles = {}) => {
  const cycle = billingCycles?.[cardName];
  const ref = normalizeReference(referenceDate);

  if (!cycle || cycle.type === 'monthly') {
    return resolveCalendarMonth(ref);
  }

  if (cycle.type === 'custom' && cycle.startDay) {
    return resolveCustomStartDay(ref, cycle.startDay);
  }

  if (cycle.type === 'statement') {
    return resolveStatementPeriod(cycle, ref);
  }

  return resolveCalendarMonth(ref);
};

/** Back-compat helper used by the dashboard date filter. */
export const resolveBillingRange = (cardName, referenceDate, billingCycles) => {
  const { start, end } = resolveBillingPeriod(cardName, referenceDate, billingCycles);
  return { start, end };
};

/** Project upcoming periods from a stored cycle (for previews / API). */
export const projectBillingPeriods = (cardName, billingCycles, referenceDate = new Date(), count = 3) => {
  const periods = [];
  let cursor = referenceDate;

  for (let i = 0; i < count; i += 1) {
    const period = resolveBillingPeriod(cardName, cursor, billingCycles);
    periods.push(period);

    const nextCursor = addDays(period.end, 1);
    if (!nextCursor || nextCursor === toIsoDate(normalizeReference(cursor))) break;
    cursor = nextCursor;
  }

  return periods;
};

const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suffix}`;
};

/**
 * Human-readable rule derived from a one-time anchor statement.
 * @returns {{ type: 'monthly'|'fixed', closeDay?: number, periodDays?: number, dueOffsetDays: number, label: string }|null}
 */
export const describeBillingRule = (anchor) => {
  if (!anchor?.statementStart || !anchor?.statementEnd || !anchor?.dueDate) return null;

  const periodDays = daysBetween(anchor.statementStart, anchor.statementEnd) + 1;
  const dueOffsetDays = daysBetween(anchor.statementEnd, anchor.dueDate);
  const dueLabel = `Due ${dueOffsetDays} day${dueOffsetDays === 1 ? '' : 's'} after close`;

  if (isMonthlyCadence(periodDays)) {
    const closeDay = parseIsoDate(anchor.statementEnd).getDate();
    return {
      type: 'monthly',
      closeDay,
      dueOffsetDays,
      label: `Closes on the ${ordinal(closeDay)} · ${dueLabel}`,
    };
  }

  return {
    type: 'fixed',
    periodDays,
    dueOffsetDays,
    label: `${periodDays}-day periods · ${dueLabel}`,
  };
};

/** Billing period immediately before the one containing referenceDate. */
export const resolvePreviousBillingPeriod = (
  cardName,
  referenceDate = new Date(),
  billingCycles = {}
) => {
  const current = resolveBillingPeriod(cardName, referenceDate, billingCycles);
  if (!current?.start) return null;
  const prevRef = addDays(current.start, -1);
  if (!prevRef) return null;
  return resolveBillingPeriod(cardName, prevRef, billingCycles);
};

export const validateBillingCycle = (cycle) => {
  if (!cycle || typeof cycle !== 'object') return 'Billing cycle must be an object';
  if (!cycle.type) return null;

  if (cycle.type === 'statement') {
    const { statementStart, statementEnd, dueDate } = cycle.anchor || {};
    const hasAny = statementStart || statementEnd || dueDate;
    const hasAll = statementStart && statementEnd && dueDate;

    if (hasAny && !hasAll) {
      return null;
    }

    if (hasAll) {
      if (daysBetween(statementStart, statementEnd) < 0) {
        return 'Statement end must be on or after statement start';
      }
      if (daysBetween(statementEnd, dueDate) < 0) {
        return 'Payment due date must be on or after statement end';
      }
    }
  }

  if (cycle.type === 'custom') {
    const day = Number(cycle.startDay);
    if (!Number.isFinite(day) || day < 1 || day > 28) {
      return 'Custom cycle start day must be between 1 and 28';
    }
  }

  return null;
};
