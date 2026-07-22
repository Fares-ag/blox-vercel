/**
 * Shared payment schedule helpers for SkipCash edge functions.
 * Dual-writes payment_schedules table + applications.installment_plan JSON.
 */

export type ScheduleRow = {
  id: string;
  due_date: string;
  amount: number;
  paid_amount: number | null;
  remaining_amount: number | null;
  status: string;
};

export function remainingOfRow(row: {
  amount?: number | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
}): number {
  if (row.remaining_amount != null && Number.isFinite(Number(row.remaining_amount))) {
    return Math.max(0, Number(row.remaining_amount));
  }
  if (row.remainingAmount != null && Number.isFinite(Number(row.remainingAmount))) {
    return Math.max(0, Number(row.remainingAmount));
  }
  const amount = Number(row.amount) || 0;
  const paid = Number(row.paid_amount ?? row.paidAmount ?? 0) || 0;
  return Math.max(0, amount - paid);
}

export function remainingOfJsonPayment(payment: any): number {
  return remainingOfRow({
    amount: payment?.amount,
    paidAmount: payment?.paidAmount,
    remainingAmount: payment?.remainingAmount,
  });
}

/** True if value looks like a UUID (payment_schedules.id). */
export function isUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function loadScheduleRows(
  supabase: any,
  applicationId: string
): Promise<ScheduleRow[]> {
  const { data, error } = await supabase
    .from('payment_schedules')
    .select('id, due_date, amount, paid_amount, remaining_amount, status')
    .eq('application_id', applicationId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('loadScheduleRows failed', error);
    return [];
  }
  return (data || []) as ScheduleRow[];
}

export function unpaidRows(rows: ScheduleRow[]): ScheduleRow[] {
  return rows.filter((r) => r.status !== 'paid' && remainingOfRow(r) > 0.001);
}

/**
 * Resolve expected max amount and target schedule for an application payment.
 * Client may pay less (partial / settlement discount) but never more than remaining.
 */
export async function resolveApplicationPayable(
  supabase: any,
  applicationId: string,
  opts: {
    isSettlement?: boolean;
    paymentScheduleId?: string | null;
    dueDate?: string | null;
  }
): Promise<{
  maxPayable: number;
  targetRow: ScheduleRow | null;
  targetDueDate: string | null;
}> {
  // payment_schedules and applications reads are independent — run in parallel.
  const [rows, applicationResult] = await Promise.all([
    loadScheduleRows(supabase, applicationId),
    supabase
      .from('applications')
      .select('installment_plan')
      .eq('id', applicationId)
      .maybeSingle() as Promise<{ data: { installment_plan: unknown } | null }>,
  ]);
  const unpaid = unpaidRows(rows);

  const application = applicationResult.data;

  const jsonSchedule: any[] = (application?.installment_plan as any)?.schedule || [];

  if (opts.isSettlement) {
    let maxPayable = 0;
    if (unpaid.length > 0) {
      maxPayable = unpaid.reduce((sum, r) => sum + remainingOfRow(r), 0);
    } else {
      maxPayable = jsonSchedule
        .filter((p) => p.status !== 'paid')
        .reduce((sum, p) => sum + remainingOfJsonPayment(p), 0);
    }
    return { maxPayable, targetRow: null, targetDueDate: null };
  }

  let target: ScheduleRow | null = null;

  if (opts.paymentScheduleId && isUuid(opts.paymentScheduleId)) {
    target = rows.find((r) => r.id === opts.paymentScheduleId) || null;
  }

  if (!target && opts.dueDate) {
    target = unpaid.find((r) => r.due_date === opts.dueDate) || null;
  }

  if (!target && opts.paymentScheduleId) {
    // JSON schedule entry id (non-UUID) — match then resolve by dueDate
    const jsonMatch = jsonSchedule.find(
      (p) => p.id === opts.paymentScheduleId || String(p.id) === String(opts.paymentScheduleId)
    );
    if (jsonMatch?.dueDate) {
      target = unpaid.find((r) => r.due_date === jsonMatch.dueDate) || null;
      if (!target) {
        return {
          maxPayable: remainingOfJsonPayment(jsonMatch),
          targetRow: null,
          targetDueDate: jsonMatch.dueDate,
        };
      }
    }
  }

  if (!target && unpaid.length > 0) {
    // Next unpaid by due date (not schedule[0])
    target = unpaid[0];
  }

  if (!target) {
    const jsonUnpaid = jsonSchedule.filter((p) => p.status !== 'paid');
    if (jsonUnpaid.length > 0) {
      // Prefer upcoming/active/due/partially_paid
      const preferred =
        jsonUnpaid.find((p) =>
          ['upcoming', 'active', 'due', 'partially_paid', 'overdue'].includes(p.status)
        ) || jsonUnpaid[0];
      return {
        maxPayable: remainingOfJsonPayment(preferred),
        targetRow: null,
        targetDueDate: preferred.dueDate || null,
      };
    }
    return { maxPayable: 0, targetRow: null, targetDueDate: null };
  }

  if (target.status === 'paid' || remainingOfRow(target) <= 0.001) {
    throw new Error('Selected installment is already paid');
  }

  return {
    maxPayable: remainingOfRow(target),
    targetRow: target,
    targetDueDate: target.due_date,
  };
}

export function validateClientAmount(clientAmount: number, maxPayable: number): number {
  if (!Number.isFinite(clientAmount) || clientAmount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (clientAmount > maxPayable + 0.01) {
    throw new Error(
      `Amount validation failed: ${clientAmount} QAR exceeds remaining ${maxPayable.toFixed(2)} QAR`
    );
  }
  // Trust capped client amount (allows partial pay / settlement discount)
  return Math.round(clientAmount * 100) / 100;
}

/**
 * Apply a completed payment to both payment_schedules and installment_plan JSON.
 */
export async function applyCompletedPaymentDualWrite(
  supabase: any,
  applicationId: string,
  opts: {
    amount: number;
    isSettlement?: boolean;
    paymentScheduleId?: string | null;
    dueDate?: string | null;
  }
): Promise<void> {
  const paidAt = new Date().toISOString();
  const paidDate = paidAt.split('T')[0];
  const payAmount = Number(opts.amount) || 0;

  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('installment_plan')
    .eq('id', applicationId)
    .single();

  if (appError || !application?.installment_plan) {
    console.error('applyCompletedPaymentDualWrite: application missing', appError);
    throw new Error(
      `applyCompletedPaymentDualWrite: application/installment_plan missing for ${applicationId}`
    );
  }

  const installmentPlan = application.installment_plan as any;
  const schedule: any[] = Array.isArray(installmentPlan.schedule)
    ? [...installmentPlan.schedule]
    : [];

  const rows = await loadScheduleRows(supabase, applicationId);

  if (opts.isSettlement) {
    const unpaid = unpaidRows(rows);
    const totalRemaining = unpaid.length
      ? unpaid.reduce((s, r) => s + remainingOfRow(r), 0)
      : schedule
          .filter((p) => p.status !== 'paid')
          .reduce((s, p) => s + remainingOfJsonPayment(p), 0);

    // Only mark all paid if settlement covers remaining (within 1 QAR tolerance for discounts)
    if (payAmount + 1 < totalRemaining) {
      console.warn('Settlement amount below remaining; applying proportional partials', {
        payAmount,
        totalRemaining,
      });
    }

    const coverAll = payAmount + 1 >= totalRemaining;

    for (let i = 0; i < schedule.length; i++) {
      const p = schedule[i];
      if (p.status === 'paid') continue;
      if (coverAll) {
        schedule[i] = {
          ...p,
          status: 'paid',
          paidAmount: Number(p.amount) || 0,
          remainingAmount: 0,
          paidDate,
        };
      }
    }

    if (coverAll) {
      for (const row of unpaid) {
        await supabase
          .from('payment_schedules')
          .update({
            status: 'paid',
            paid_date: paidAt,
            paid_amount: Number(row.amount) || 0,
            remaining_amount: 0,
            updated_at: paidAt,
          })
          .eq('id', row.id);
      }
    }

    await supabase
      .from('applications')
      .update({
        installment_plan: { ...installmentPlan, schedule },
      })
      .eq('id', applicationId);
    return;
  }

  // Single installment
  let dueDate = opts.dueDate || null;
  let targetRow: ScheduleRow | null = null;

  // Idempotency: if dueDate already fully paid, do not add amount again
  if (opts.dueDate) {
    const existingPaidRow = rows.find((r) => r.due_date === opts.dueDate && r.status === 'paid');
    const jsonPaid = schedule.find(
      (p) => p.dueDate === opts.dueDate && p.status === 'paid'
    );
    if (existingPaidRow || jsonPaid) {
      console.log('applyCompletedPaymentDualWrite: already paid, skipping', {
        applicationId,
        dueDate: opts.dueDate,
      });
      return;
    }
  }

  if (opts.paymentScheduleId && isUuid(opts.paymentScheduleId)) {
    targetRow = rows.find((r) => r.id === opts.paymentScheduleId) || null;
    if (targetRow) dueDate = targetRow.due_date;
  }

  if (!targetRow && dueDate) {
    targetRow = rows.find((r) => r.due_date === dueDate) || null;
  }

  if (!dueDate) {
    const unpaid = unpaidRows(rows);
    if (unpaid[0]) {
      targetRow = unpaid[0];
      dueDate = unpaid[0].due_date;
    } else {
      const jsonUnpaidIdx = schedule.findIndex((p) => p.status !== 'paid');
      if (jsonUnpaidIdx >= 0) {
        dueDate = schedule[jsonUnpaidIdx].dueDate;
      }
    }
  }

  if (!dueDate) {
    console.error('applyCompletedPaymentDualWrite: could not resolve due date', {
      applicationId,
      paymentScheduleId: opts.paymentScheduleId,
    });
    throw new Error(
      `applyCompletedPaymentDualWrite: could not resolve due date for ${applicationId}`
    );
  }

  const jsonIndex = schedule.findIndex((p) => p.dueDate === dueDate);
  if (jsonIndex === -1) {
    console.error('applyCompletedPaymentDualWrite: dueDate not in JSON schedule', dueDate);
  } else {
    const payment = schedule[jsonIndex];
    const originalAmount = Number(payment.amount) || 0;
    const currentPaid = Number(payment.paidAmount) || 0;
    const newPaid = currentPaid + payAmount;
    const remaining = Math.max(0, originalAmount - newPaid);
    schedule[jsonIndex] = {
      ...payment,
      status: remaining <= 0.01 ? 'paid' : 'partially_paid',
      paidAmount: newPaid,
      remainingAmount: remaining,
      paidDate: remaining <= 0.01 ? paidDate : payment.paidDate || paidDate,
    };

    await supabase
      .from('applications')
      .update({
        installment_plan: { ...installmentPlan, schedule },
      })
      .eq('id', applicationId);
  }

  // Dual-write payment_schedules
  if (targetRow) {
    const originalAmount = Number(targetRow.amount) || 0;
    const existingPaid = Number(targetRow.paid_amount) || 0;
    const updatedPaid = existingPaid + payAmount;
    const updatedRemaining = Math.max(0, originalAmount - updatedPaid);
    await supabase
      .from('payment_schedules')
      .update({
        status: updatedRemaining <= 0.01 ? 'paid' : 'partially_paid',
        paid_date: updatedRemaining <= 0.01 ? paidAt : targetRow.due_date,
        paid_amount: updatedPaid,
        remaining_amount: updatedRemaining,
        updated_at: paidAt,
      })
      .eq('id', targetRow.id);
  } else {
    const originalAmount =
      jsonIndex >= 0 ? Number(schedule[jsonIndex].amount) || payAmount : payAmount;
    const { data: existing } = await supabase
      .from('payment_schedules')
      .select('id, paid_amount')
      .eq('application_id', applicationId)
      .eq('due_date', dueDate)
      .limit(1);

    if (existing && existing.length > 0) {
      const existingPaid = Number(existing[0].paid_amount) || 0;
      const updatedPaid = existingPaid + payAmount;
      const updatedRemaining = Math.max(0, originalAmount - updatedPaid);
      await supabase
        .from('payment_schedules')
        .update({
          status: updatedRemaining <= 0.01 ? 'paid' : 'partially_paid',
          paid_date: updatedRemaining <= 0.01 ? paidAt : null,
          paid_amount: updatedPaid,
          remaining_amount: updatedRemaining,
          updated_at: paidAt,
        })
        .eq('id', existing[0].id);
    } else {
      const remaining = Math.max(0, originalAmount - payAmount);
      await supabase.from('payment_schedules').insert({
        application_id: applicationId,
        due_date: dueDate,
        amount: originalAmount,
        paid_amount: payAmount,
        remaining_amount: remaining,
        status: remaining <= 0.01 ? 'paid' : 'partially_paid',
        paid_date: remaining <= 0.01 ? paidAt : null,
        created_at: paidAt,
        updated_at: paidAt,
      });
    }
  }
}

/** Require explicit SKIPCASH_USE_SANDBOX=true|false */
export function resolveUseSandbox(): boolean {
  const raw = Deno.env.get('SKIPCASH_USE_SANDBOX');
  if (raw !== 'true' && raw !== 'false') {
    throw new Error(
      'SKIPCASH_USE_SANDBOX must be explicitly set to "true" or "false" in Edge Function secrets'
    );
  }
  return raw === 'true';
}
