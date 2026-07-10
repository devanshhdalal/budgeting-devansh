import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  parseIsoDate,
  projectBillingPeriods,
  resolveBillingPeriod,
  resolveBillingRange,
  toIsoDate,
  validateBillingCycle,
} from './billingCycle.js';

describe('parseIsoDate / toIsoDate', () => {
  it('round-trips calendar dates', () => {
    const date = parseIsoDate('2025-03-15');
    expect(toIsoDate(date)).toBe('2025-03-15');
  });

  it('returns null for invalid input', () => {
    expect(parseIsoDate('not-a-date')).toBeNull();
  });
});

describe('daysBetween / addDays', () => {
  it('counts inclusive span across month boundary', () => {
    expect(daysBetween('2025-01-31', '2025-02-01')).toBe(1);
  });

  it('adds days across months', () => {
    expect(addDays('2025-01-28', 5)).toBe('2025-02-02');
  });
});

describe('validateBillingCycle', () => {
  it('accepts monthly type', () => {
    expect(validateBillingCycle({ type: 'monthly' })).toBeNull();
  });

  it('accepts a complete statement anchor', () => {
    expect(
      validateBillingCycle({
        type: 'statement',
        anchor: {
          statementStart: '2024-12-13',
          statementEnd: '2025-01-12',
          dueDate: '2025-02-05',
        },
      })
    ).toBeNull();
  });

  // Partial anchors are allowed while editing (auto-save); ordering validated when complete.
  it('accepts statement type with partial anchor', () => {
    expect(
      validateBillingCycle({
        type: 'statement',
        anchor: { statementStart: '2025-01-01', statementEnd: '', dueDate: '' },
      })
    ).toBeNull();
  });

  it('accepts statement type with empty anchor', () => {
    expect(validateBillingCycle({ type: 'statement', anchor: {} })).toBeNull();
  });

  it('rejects statement end before start', () => {
    expect(
      validateBillingCycle({
        type: 'statement',
        anchor: {
          statementStart: '2025-02-10',
          statementEnd: '2025-02-01',
          dueDate: '2025-02-15',
        },
      })
    ).toBe('Statement end must be on or after statement start');
  });

  it('rejects due date before statement end', () => {
    expect(
      validateBillingCycle({
        type: 'statement',
        anchor: {
          statementStart: '2025-01-01',
          statementEnd: '2025-01-31',
          dueDate: '2025-01-20',
        },
      })
    ).toBe('Payment due date must be on or after statement end');
  });

  it('rejects invalid custom start day', () => {
    expect(validateBillingCycle({ type: 'custom', startDay: 29 })).toBe(
      'Custom cycle start day must be between 1 and 28'
    );
  });
});

describe('resolveBillingPeriod', () => {
  const monthlyAnchor = {
    type: 'statement',
    anchor: {
      statementStart: '2024-12-13',
      statementEnd: '2025-01-12',
      dueDate: '2025-02-05',
    },
  };

  const biweeklyAnchor = {
    type: 'statement',
    anchor: {
      statementStart: '2025-01-01',
      statementEnd: '2025-01-14',
      dueDate: '2025-01-21',
    },
  };

  it('uses calendar month when cycle is monthly', () => {
    const period = resolveBillingPeriod('Card', '2025-06-15', {
      Card: { type: 'monthly' },
    });
    expect(period).toEqual({ start: '2025-06-01', end: '2025-06-30', due: null });
  });

  it('falls back to calendar month when statement anchor is incomplete', () => {
    const period = resolveBillingPeriod('Card', '2025-06-15', {
      Card: { type: 'statement', anchor: { statementStart: '2025-01-01' } },
    });
    expect(period).toEqual({ start: '2025-06-01', end: '2025-06-30', due: null });
  });

  it('projects monthly statement periods from anchor close day', () => {
    const period = resolveBillingPeriod('AMEX', '2025-01-15', {
      AMEX: monthlyAnchor,
    });
    expect(period.start).toBe('2025-01-13');
    expect(period.end).toBe('2025-02-12');
    expect(period.due).toBe('2025-03-08');
  });

  it('slides fixed-length statement periods forward', () => {
    const period = resolveBillingPeriod('Neo', '2025-02-10', {
      Neo: biweeklyAnchor,
    });
    expect(period).toEqual({
      start: '2025-01-29',
      end: '2025-02-11',
      due: '2025-02-18',
    });
  });
});

describe('resolveBillingRange', () => {
  it('returns start and end without due', () => {
    expect(resolveBillingRange('Card', '2025-03-10', { Card: { type: 'monthly' } })).toEqual({
      start: '2025-03-01',
      end: '2025-03-31',
    });
  });
});

describe('projectBillingPeriods', () => {
  it('returns consecutive non-overlapping periods', () => {
    const periods = projectBillingPeriods(
      'Card',
      { Card: { type: 'monthly' } },
      '2025-01-15',
      3
    );
    expect(periods).toHaveLength(3);
    expect(periods[0]).toEqual({ start: '2025-01-01', end: '2025-01-31', due: null });
    expect(periods[1]).toEqual({ start: '2025-02-01', end: '2025-02-28', due: null });
    expect(periods[2]).toEqual({ start: '2025-03-01', end: '2025-03-31', due: null });
  });
});
