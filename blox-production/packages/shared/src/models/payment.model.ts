export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'wallet';
  label: string;
  icon?: string;
  enabled: boolean;
}

export interface PaymentTransaction {
  id: string;
  applicationId: string;
  paymentScheduleId?: string; // If paying a specific installment
  amount: number;
  method: PaymentMethod['type'];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  receiptUrl?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface PaymentRequest {
  applicationId: string;
  paymentScheduleId?: string;
  amount: number;
  method: PaymentMethod['type'];
  cardDetails?: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  };
  bankTransferDetails?: {
    bankName: string;
    accountNumber: string;
    reference: string;
  };
}


