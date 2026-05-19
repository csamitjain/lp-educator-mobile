/**
 * Fee Utilities
 *
 * Pure functions for fee calculations — unit tested in __tests__/fee-utils.test.ts
 */

import type { FeePlan, FeePayment } from '@/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeeStatus {
  childId: string;
  planId: string;
  amount: number;
  cycle: string;
  isPaid: boolean;
  paidOn: string | null;
  paidAmount: number | null;
  forMonth: string;
}

// ─── Current Month Helper ─────────────────────────────────────────────────────

/** Get current month as "YYYY-MM" string */
export function currentYearMonth(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Get month display label: "January 2025" */
export function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// ─── Fee Pending Count ────────────────────────────────────────────────────────

/**
 * Calculate number of students with PENDING fee for the current month.
 *
 * Spec §9: Fee Pending count = distinct fee_plans.child_id where active
 * for this educator/role MINUS distinct fee_payments.child_id for current YYYY-MM.
 *
 * @param plans    - Active fee plans for the educator+role
 * @param payments - All payments for current month (for_month = currentYearMonth)
 * @param month    - The month to check (YYYY-MM), defaults to current month
 */
export function calculateFeePendingCount(
  plans: FeePlan[],
  payments: FeePayment[],
  month = currentYearMonth()
): number {
  const activePlanChildIds = new Set(
    plans.filter((p) => p.is_active).map((p) => p.child_id)
  );

  const paidChildIds = new Set(
    payments.filter((p) => p.for_month === month).map((p) => p.child_id)
  );

  let pending = 0;
  for (const childId of activePlanChildIds) {
    if (!paidChildIds.has(childId)) pending++;
  }
  return pending;
}

// ─── Fee Status Per Student ───────────────────────────────────────────────────

/**
 * Build fee status for each child — used in the Fee screen lists.
 */
export function buildFeeStatusList(
  plans: FeePlan[],
  payments: FeePayment[],
  month = currentYearMonth()
): FeeStatus[] {
  const paymentMap = new Map<string, FeePayment>();
  for (const p of payments) {
    if (p.for_month === month) {
      paymentMap.set(p.child_id, p);
    }
  }

  return plans
    .filter((plan) => plan.is_active)
    .map((plan) => {
      const payment = paymentMap.get(plan.child_id) ?? null;
      return {
        childId: plan.child_id,
        planId: plan.id,
        amount: plan.amount,
        cycle: plan.cycle,
        isPaid: !!payment,
        paidOn: payment?.paid_on ?? null,
        paidAmount: payment?.amount ?? null,
        forMonth: month,
      };
    });
}

// ─── Monthly Fee Amount ───────────────────────────────────────────────────────

/**
 * Convert quarterly fee to monthly equivalent for display.
 */
export function monthlyEquivalent(plan: FeePlan): number {
  if (plan.cycle === 'quarterly') {
    return Math.round(plan.amount / 3);
  }
  return plan.amount;
}

// ─── Total Collected ─────────────────────────────────────────────────────────

/**
 * Sum of all payments for a given month.
 */
export function totalCollectedForMonth(payments: FeePayment[], month: string): number {
  return payments
    .filter((p) => p.for_month === month)
    .reduce((sum, p) => sum + p.amount, 0);
}
