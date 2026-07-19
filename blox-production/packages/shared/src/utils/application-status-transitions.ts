import type { ApplicationStatus } from '../models/application.model';

/**
 * Allowed application status transitions.
 * Enforced in supabaseApiService.updateApplication (fail closed).
 *
 * Customer: resubmit docs, submit signed contract, cancel early pipeline.
 * Admin/super_admin: ops matrix (includes direct approve → active).
 */

const CUSTOMER_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  resubmission_required: ['under_review'],
  contract_signing_required: ['contracts_submitted', 'submission_cancelled'],
  under_review: ['submission_cancelled'],
  draft: ['under_review', 'submission_cancelled'],
  down_payment_required: ['submission_cancelled'],
};

const ADMIN_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  draft: ['under_review', 'active', 'rejected', 'submission_cancelled'],
  under_review: [
    'contract_signing_required',
    'resubmission_required',
    'rejected',
    'active', // direct approve (product-supported)
    'submission_cancelled',
  ],
  resubmission_required: ['under_review', 'rejected', 'submission_cancelled'],
  contract_signing_required: [
    'contracts_submitted',
    'resubmission_required',
    'rejected',
    'under_review',
  ],
  contracts_submitted: [
    'contract_under_review',
    'active',
    'contract_signing_required',
    'rejected',
    'resubmission_required',
  ],
  contract_under_review: [
    'active',
    'contract_signing_required',
    'rejected',
    'down_payment_required',
  ],
  down_payment_required: ['down_payment_submitted', 'active', 'rejected'],
  down_payment_submitted: ['active', 'rejected', 'down_payment_required'],
  active: ['completed', 'submission_cancelled'],
  rejected: ['under_review'],
  completed: [],
  submission_cancelled: ['under_review'],
};

export type TransitionActor = 'customer' | 'admin' | 'super_admin' | 'system';

export function canTransitionApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor
): boolean {
  if (from === to) return true;
  if (actor === 'system') return true;

  if (actor === 'customer') {
    const allowed = CUSTOMER_ALLOWED[from] || [];
    return allowed.includes(to);
  }

  if (actor === 'admin' || actor === 'super_admin') {
    const allowed = ADMIN_ALLOWED[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  return false;
}

export function assertApplicationStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor
): void {
  if (!canTransitionApplicationStatus(from, to, actor)) {
    throw new Error(`Illegal status transition for ${actor}: ${from} → ${to}`);
  }
}

/** True when the customer UI may offer cancel for this status (matches CUSTOMER_ALLOWED). */
export function customerCanCancelApplication(status: ApplicationStatus): boolean {
  return canTransitionApplicationStatus(status, 'submission_cancelled', 'customer');
}
