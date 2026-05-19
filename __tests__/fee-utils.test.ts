import {
  calculateFeePendingCount,
  buildFeeStatusList,
  currentYearMonth,
  formatYearMonth,
  monthlyEquivalent,
  totalCollectedForMonth,
} from '../src/lib/fee-utils';
import type { FeePlan, FeePayment } from '../src/types/database';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MONTH = '2025-06';

function makePlan(overrides: Partial<FeePlan> = {}): FeePlan {
  return {
    id: 'plan-1',
    educator_id: 'edu-1',
    role_instance_id: 'role-1',
    child_id: 'child-1',
    amount: 1000,
    cycle: 'monthly',
    start_month: '2025-01',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePayment(overrides: Partial<FeePayment> = {}): FeePayment {
  return {
    id: 'pay-1',
    educator_id: 'edu-1',
    child_id: 'child-1',
    plan_id: 'plan-1',
    amount: 1000,
    for_month: MONTH,
    paid_on: '2025-06-05',
    method: 'cash',
    note: null,
    created_at: '2025-06-05T00:00:00Z',
    ...overrides,
  };
}

// ─── calculateFeePendingCount ─────────────────────────────────────────────────

describe('calculateFeePendingCount', () => {
  it('returns 0 when no active plans', () => {
    expect(calculateFeePendingCount([], [], MONTH)).toBe(0);
  });

  it('returns 1 when one active plan and no payments', () => {
    const plans = [makePlan()];
    expect(calculateFeePendingCount(plans, [], MONTH)).toBe(1);
  });

  it('returns 0 when one active plan and payment exists for month', () => {
    const plans = [makePlan()];
    const payments = [makePayment()];
    expect(calculateFeePendingCount(plans, payments, MONTH)).toBe(0);
  });

  it('counts correctly with multiple children', () => {
    const plans = [
      makePlan({ id: 'plan-1', child_id: 'child-1' }),
      makePlan({ id: 'plan-2', child_id: 'child-2' }),
      makePlan({ id: 'plan-3', child_id: 'child-3' }),
    ];
    const payments = [
      makePayment({ child_id: 'child-1', for_month: MONTH }),
    ];
    // child-2 and child-3 are pending
    expect(calculateFeePendingCount(plans, payments, MONTH)).toBe(2);
  });

  it('ignores inactive plans', () => {
    const plans = [
      makePlan({ child_id: 'child-1', is_active: true }),
      makePlan({ id: 'plan-2', child_id: 'child-2', is_active: false }),
    ];
    expect(calculateFeePendingCount(plans, [], MONTH)).toBe(1);
  });

  it('ignores payments from a different month', () => {
    const plans = [makePlan()];
    const payments = [makePayment({ for_month: '2025-05' })]; // different month
    expect(calculateFeePendingCount(plans, payments, MONTH)).toBe(1);
  });
});

// ─── buildFeeStatusList ───────────────────────────────────────────────────────

describe('buildFeeStatusList', () => {
  it('marks isPaid=false when no payment', () => {
    const [status] = buildFeeStatusList([makePlan()], [], MONTH);
    expect(status.isPaid).toBe(false);
    expect(status.paidOn).toBeNull();
  });

  it('marks isPaid=true and includes paidOn when payment exists', () => {
    const [status] = buildFeeStatusList(
      [makePlan()],
      [makePayment({ paid_on: '2025-06-10' })],
      MONTH
    );
    expect(status.isPaid).toBe(true);
    expect(status.paidOn).toBe('2025-06-10');
  });

  it('excludes inactive plans', () => {
    const result = buildFeeStatusList([makePlan({ is_active: false })], [], MONTH);
    expect(result).toHaveLength(0);
  });
});

// ─── currentYearMonth ─────────────────────────────────────────────────────────

describe('currentYearMonth', () => {
  it('returns YYYY-MM format', () => {
    const result = currentYearMonth(new Date('2025-06-15T10:00:00Z'));
    expect(result).toBe('2025-06');
  });

  it('pads single-digit months', () => {
    const result = currentYearMonth(new Date('2025-03-01T00:00:00Z'));
    expect(result).toBe('2025-03');
  });
});

// ─── formatYearMonth ──────────────────────────────────────────────────────────

describe('formatYearMonth', () => {
  it('formats YYYY-MM to human-readable', () => {
    const result = formatYearMonth('2025-06');
    expect(result).toContain('June');
    expect(result).toContain('2025');
  });
});

// ─── monthlyEquivalent ────────────────────────────────────────────────────────

describe('monthlyEquivalent', () => {
  it('returns amount as-is for monthly plans', () => {
    expect(monthlyEquivalent(makePlan({ amount: 1200, cycle: 'monthly' }))).toBe(1200);
  });

  it('divides by 3 for quarterly plans', () => {
    expect(monthlyEquivalent(makePlan({ amount: 3000, cycle: 'quarterly' }))).toBe(1000);
  });

  it('rounds quarterly to nearest integer', () => {
    expect(monthlyEquivalent(makePlan({ amount: 1000, cycle: 'quarterly' }))).toBe(333);
  });
});

// ─── totalCollectedForMonth ───────────────────────────────────────────────────

describe('totalCollectedForMonth', () => {
  it('returns 0 with no payments', () => {
    expect(totalCollectedForMonth([], MONTH)).toBe(0);
  });

  it('sums payments for the given month', () => {
    const payments = [
      makePayment({ id: 'p1', child_id: 'c1', amount: 1000, for_month: MONTH }),
      makePayment({ id: 'p2', child_id: 'c2', amount: 2000, for_month: MONTH }),
    ];
    expect(totalCollectedForMonth(payments, MONTH)).toBe(3000);
  });

  it('excludes payments from other months', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 1000, for_month: MONTH }),
      makePayment({ id: 'p2', amount: 500, for_month: '2025-05' }),
    ];
    expect(totalCollectedForMonth(payments, MONTH)).toBe(1000);
  });
});
