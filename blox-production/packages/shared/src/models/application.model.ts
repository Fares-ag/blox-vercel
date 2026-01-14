import type { Product } from './product.model';
import type { Offer } from './offer.model';
import type { ContractFormData } from '../services/contractPdf.service';

/**
 * Extended customer information with optional fields
 * Allows for additional fields beyond the base CustomerInformation interface
 */
export interface ExtendedCustomerInformation extends CustomerInformation {
  gender?: string;
  nationalId?: string; // Legacy field name, use qid instead
  [key: string]: unknown; // Allow additional fields for flexibility
}

export interface Application {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleId: string;
  vehicle?: Product;
  offerId: string;
  offer?: Offer;
  status: ApplicationStatus;
  loanAmount: number;
  downPayment: number;
  installmentPlan?: InstallmentPlan;
  documents?: Document[];
  paymentHistory?: Payment[];
  createdAt: string;
  updatedAt: string;
  submissionDate?: string;
  contractGenerated?: boolean;
  contractSigned?: boolean;
  contractData?: ContractFormData;
  contractReviewComments?: string; // Comments from admin review
  contractReviewDate?: string; // Date of review
  contractSignature?: string; // Customer's signature
  signedContractFile?: string; // Base64 or URL (depending on upload flow)
  signedContractFileName?: string; // Original filename for the signed contract
  signedContractUploadedAt?: string; // Timestamp when signed contract was uploaded
  resubmissionComments?: string; // Comments when requesting resubmission (e.g., wrong document)
  resubmissionDate?: string; // Date when resubmission was requested
  cancelledByCustomer?: boolean; // True if cancelled by customer
  cancelledAt?: string; // Date when application was cancelled
  bloxMembership?: BloxMembership;
  customerInfo?: ExtendedCustomerInformation;
  origin?: 'manual' | 'ai' | 'api'; // Source/origin of the application (default: 'manual')
}

export interface BloxMembership {
  isActive: boolean;
  membershipType: 'monthly' | 'yearly';
  purchasedDate: string;
  cost: number;
  nextBillingDate?: string; // For monthly memberships
  renewalDate?: string; // For yearly memberships
}

export interface PaymentDeferral {
  id: string;
  paymentId: string;
  applicationId: string;
  originalDueDate: string;
  deferredToDate: string;
  deferredDate: string; // when customer requested deferral
  reason?: string;
  year: number; // Calendar year for tracking 3 per year limit
  deferredAmount?: number; // Amount deferred (if partial deferral). If undefined, full amount is deferred.
  originalAmount?: number; // Original payment amount before deferral
}

export type ApplicationStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'under_review'
  | 'rejected'
  | 'contract_signing_required'
  | 'resubmission_required'
  | 'contracts_submitted'
  | 'contract_under_review'
  | 'down_payment_required'
  | 'down_payment_submitted'
  | 'submission_cancelled';

export interface CustomerInformation {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  qid?: string; // Qatar ID number
  address: Address;
  employment: EmploymentInfo;
  income: IncomeInfo;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface EmploymentInfo {
  company: string;
  position: string;
  employmentType: string;
  employmentDuration: string;
  salary: number;
}

export interface IncomeInfo {
  monthlyIncome: number;
  otherIncome?: number;
  totalIncome: number;
}

export interface InstallmentPlan {
  tenure: string;
  interval: string;
  /**
   * For dynamic-rent plans this is the first month payment (payments decrease).
   * For amortized-fixed plans this is the fixed monthly payment.
   * For balloon_payment plans this is the monthly installment amount.
   */
  monthlyAmount: number;
  totalAmount: number;
  downPayment?: number;
  schedule: PaymentSchedule[];
  annualRentalRate?: number; // Store the rate used for calculation (as decimal, e.g., 0.12)
  /**
   * How the installment schedule was calculated.
   * - dynamic_rent: current Blox model (principal + decreasing rent)
   * - amortized_fixed: standard amortized loan payment (fixed monthly payment)
   * - balloon_payment: down payment + monthly installments + balloon payment at end
   */
  calculationMethod?: 'dynamic_rent' | 'amortized_fixed' | 'balloon_payment';
  /** Annual interest rate used for amortized_fixed (decimal, e.g., 0.1206). */
  annualInterestRate?: number;
  /**
   * Balloon payment configuration (only used when calculationMethod is 'balloon_payment')
   */
  balloonPayment?: {
    /** Balloon payment amount (fixed amount) */
    amount?: number;
    /** Balloon payment as percentage of vehicle price (e.g., 20 for 20%) */
    percentage?: number;
    /** When the balloon payment is due (end of term or specific date) */
    dueDate?: string;
  };
  /**
   * Payment structure breakdown for balloon payment plans
   * e.g., { downPaymentPercent: 20, installmentPercent: 60, balloonPercent: 20 }
   */
  paymentStructure?: {
    downPaymentPercent?: number;
    installmentPercent?: number;
    balloonPercent?: number;
  };
}

export interface PaymentSchedule {
  id?: string;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
  paidDate?: string;
  transactionId?: string;
  // Partial payment fields
  paidAmount?: number; // Amount paid so far
  remainingAmount?: number; // Amount still due
  // Deferral-related fields (optional; derived from payment_deferrals or computed)
  isDeferred?: boolean;
  isPartiallyDeferred?: boolean;
  originalDueDate?: string;
  originalAmount?: number;
  paymentMethod?: 'bank_account' | 'cheque' | 'cash';
  proofDocument?: {
    name: string;
    url: string;
    uploadedAt: string;
  };
  // Receipt information
  receiptUrl?: string; // URL to download receipt
  receiptGeneratedAt?: string; // When receipt was generated
  /**
   * Type of payment in the schedule
   * - down_payment: Initial down payment
   * - installment: Regular monthly installment
   * - balloon_payment: Final balloon payment
   */
  paymentType?: 'down_payment' | 'installment' | 'balloon_payment';
  /**
   * For balloon payments, indicates this is the final large payment
   */
  isBalloon?: boolean;
}

export type PaymentStatus = 'due' | 'active' | 'paid' | 'unpaid' | 'partially_paid' | 'upcoming';

export interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
  uploadedAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  type: string;
  status: PaymentStatus;
  date: string;
  receipt?: string;
}
