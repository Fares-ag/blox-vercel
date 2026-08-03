import type { ApplicationStatus } from '../models/application.model';

/**
 * Allowed application status transitions.
 * Enforced in supabaseApiService.updateApplication (fail closed) + DB trigger.
 */

const CUSTOMER_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  resubmission_required: ['under_review'],
  contract_signing_required: ['contracts_submitted', 'submission_cancelled'],
  under_review: ['submission_cancelled'],
  draft: ['under_review', 'submission_cancelled'],
  down_payment_required: ['submission_cancelled'],
  pending_finance_activation: ['submission_cancelled'],
};

const DEALER_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  draft: ['under_review', 'submission_cancelled'],
  resubmission_required: ['under_review'],
};

/** Credit decides + final activation (Activate → active). */
const CREDIT_OFFICER_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  under_review: [
    'contract_signing_required',
    'resubmission_required',
    'rejected',
    'pending_finance_activation',
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
    'pending_finance_activation',
    'active',
    'contract_signing_required',
    'rejected',
    'resubmission_required',
  ],
  contract_under_review: [
    'pending_finance_activation',
    'active',
    'contract_signing_required',
    'rejected',
    'down_payment_required',
  ],
  down_payment_required: [
    'down_payment_submitted',
    'pending_finance_activation',
    'rejected',
  ],
  down_payment_submitted: [
    'pending_finance_activation',
    'active',
    'rejected',
    'down_payment_required',
  ],
  pending_finance_activation: ['active', 'rejected', 'under_review'],
  rejected: ['under_review'],
};

/**
 * Finance = credit decision parity without activation.
 * Credit-like actions land on pending_finance_activation; Activate is credit/admin only.
 */
const FINANCE_OFFICER_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  under_review: [
    'contract_signing_required',
    'resubmission_required',
    'rejected',
    'pending_finance_activation',
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
    'pending_finance_activation',
    'contract_signing_required',
    'rejected',
    'resubmission_required',
  ],
  contract_under_review: [
    'pending_finance_activation',
    'contract_signing_required',
    'rejected',
    'down_payment_required',
  ],
  down_payment_required: [
    'down_payment_submitted',
    'pending_finance_activation',
    'rejected',
  ],
  down_payment_submitted: [
    'pending_finance_activation',
    'rejected',
    'down_payment_required',
  ],
  pending_finance_activation: ['rejected', 'under_review'],
  rejected: ['under_review'],
};

const ADMIN_ALLOWED: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  draft: [
    'under_review',
    'active',
    'pending_finance_activation',
    'rejected',
    'submission_cancelled',
  ],
  under_review: [
    'contract_signing_required',
    'resubmission_required',
    'rejected',
    'active',
    'pending_finance_activation',
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
    'pending_finance_activation',
    'contract_signing_required',
    'rejected',
    'resubmission_required',
  ],
  contract_under_review: [
    'active',
    'pending_finance_activation',
    'contract_signing_required',
    'rejected',
    'down_payment_required',
  ],
  down_payment_required: [
    'down_payment_submitted',
    'active',
    'pending_finance_activation',
    'rejected',
  ],
  down_payment_submitted: [
    'active',
    'pending_finance_activation',
    'rejected',
    'down_payment_required',
  ],
  pending_finance_activation: ['active', 'rejected', 'under_review', 'submission_cancelled'],
  active: ['completed', 'submission_cancelled'],
  rejected: ['under_review'],
  completed: [],
  submission_cancelled: ['under_review'],
};

export type TransitionActor =
  | 'customer'
  | 'admin'
  | 'super_admin'
  | 'dealer_agent'
  | 'credit_officer'
  | 'finance_officer'
  | 'system';

/** Statuses credit officers see in their queue (submitted pipeline). */
export const CREDIT_PIPELINE_STATUSES: ApplicationStatus[] = [
  'under_review',
  'resubmission_required',
  'contract_signing_required',
  'contracts_submitted',
  'contract_under_review',
  'down_payment_required',
  'down_payment_submitted',
];

/**
 * Credit queue list statuses — pipeline plus rejected and pending activation
 * so officers can activate without a deep link. Active stays out.
 */
export const CREDIT_QUEUE_STATUSES: ApplicationStatus[] = [
  ...CREDIT_PIPELINE_STATUSES,
  'pending_finance_activation',
  'rejected',
];

/** Finance activation queue (primary + adjacent handoff states). */
export const FINANCE_ACTIVATION_QUEUE_STATUSES: ApplicationStatus[] = [
  'pending_finance_activation',
  'contracts_submitted',
  'contract_under_review',
  'down_payment_submitted',
];

/**
 * Finance review queue — same pipeline as credit so officers can decide
 * (approve / reject / resubmit) before activation.
 */
export const FINANCE_REVIEW_QUEUE_STATUSES: ApplicationStatus[] = [
  ...CREDIT_PIPELINE_STATUSES,
  'rejected',
];

/** Finance operational book (activated financing). */
export const FINANCE_ACTIVE_BOOK_STATUSES: ApplicationStatus[] = ['active'];

export function canTransitionApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor
): boolean {
  if (from === to) return true;
  if (actor === 'system') return true;

  if (actor === 'customer') {
    return (CUSTOMER_ALLOWED[from] || []).includes(to);
  }

  if (actor === 'dealer_agent') {
    return (DEALER_ALLOWED[from] || []).includes(to);
  }

  if (actor === 'credit_officer') {
    return (CREDIT_OFFICER_ALLOWED[from] || []).includes(to);
  }

  if (actor === 'finance_officer') {
    return (FINANCE_OFFICER_ALLOWED[from] || []).includes(to);
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
