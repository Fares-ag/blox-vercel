import moment from 'moment';
import type { PaymentSchedule, PaymentStatus } from '../models/application.model';

export type NormalizedInstallmentInterval = 'daily' | 'monthly' | 'other';

export function normalizeInstallmentInterval(interval?: string): NormalizedInstallmentInterval {
  const v = (interval || '').toString().trim().toLowerCase();
  if (v === 'daily') return 'daily';
  if (v === 'monthly') return 'monthly';
  return 'other';
}

/**
 * Heuristic: if any calendar month contains more than one payment entry, the schedule is
 * not a typical "one payment per month" schedule (often daily or weekly).
 */
export function isScheduleLikelyDaily(schedule: PaymentSchedule[]): boolean {
  if (!Array.isArray(schedule) || schedule.length === 0) return false;

  const counts = new Map<string, number>();
  for (const p of schedule) {
    const d = moment(p.dueDate);
    if (!d.isValid()) continue;
    const key = d.format('YYYY-MM');
    const next = (counts.get(key) || 0) + 1;
    if (next > 1) return true;
    counts.set(key, next);
  }

  return false;
}

function aggregateMonthStatus(items: PaymentSchedule[]): PaymentStatus {
  if (items.length === 0) return 'upcoming';

  const statuses = items.map((p) => p.status).filter(Boolean) as PaymentStatus[];
  if (statuses.length === 0) return 'upcoming';

  const allPaid = statuses.every((s) => s === 'paid');
  if (allPaid) return 'paid';

  // "Worse" statuses win, then active/due, then upcoming
  if (statuses.some((s) => s === 'unpaid')) return 'unpaid';
  if (statuses.some((s) => s === 'partially_paid')) return 'partially_paid';
  if (statuses.some((s) => s === 'due')) return 'due';
  if (statuses.some((s) => s === 'active')) return 'active';
  return 'upcoming';
}

/**
 * Convert a daily schedule (many payments per month) into a monthly schedule (one payment per month)
 * by summing amounts per month.
 *
 * - dueDate: last daily dueDate in that month (keeps it in/after the period being paid)
 * - amount: sum of amounts in the month
 * - status: aggregated status (paid only if all are paid; otherwise worst status wins)
 */
export function aggregateDailyScheduleToMonthly(schedule: PaymentSchedule[]): PaymentSchedule[] {
  if (!Array.isArray(schedule) || schedule.length === 0) return [];

  const groups = new Map<string, PaymentSchedule[]>();

  for (const p of schedule) {
    const d = moment(p.dueDate);
    if (!d.isValid()) continue;
    const key = d.format('YYYY-MM');
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }

  const months = Array.from(groups.keys()).sort();

  return months
    .map((monthKey) => {
      const items = (groups.get(monthKey) || []).slice().sort((a, b) => {
        return moment(a.dueDate).valueOf() - moment(b.dueDate).valueOf();
      });

      if (items.length === 0) return null;

      const lastDue = moment(items[items.length - 1].dueDate);
      const amount = items.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const status = aggregateMonthStatus(items);

      const paidDate =
        status === 'paid'
          ? items
              .map((p) => p.paidDate)
              .filter(Boolean)
              .map((d) => moment(d as string))
              .filter((d) => d.isValid())
              .sort((a, b) => a.valueOf() - b.valueOf())
              .pop()
              ?.format('YYYY-MM-DD')
          : undefined;

      const isDeferred = items.some((p) => !!p.isDeferred);
      const isPartiallyDeferred = items.some((p) => !!p.isPartiallyDeferred);

      const out: PaymentSchedule = {
        dueDate: lastDue.isValid() ? lastDue.format('YYYY-MM-DD') : monthKey + '-01',
        amount,
        status,
        ...(paidDate ? { paidDate } : {}),
        ...(isDeferred ? { isDeferred } : {}),
        ...(isPartiallyDeferred ? { isPartiallyDeferred } : {}),
      };

      return out;
    })
    .filter((p): p is PaymentSchedule => !!p && (Number(p.amount) || 0) > 0);
}


