export interface SettlementDiscountSettings {
  id: string;
  name: string;
  description?: string;
  
  // Principal Discount Settings
  principalDiscountEnabled: boolean;
  principalDiscountType: 'percentage' | 'fixed';
  principalDiscountValue: number;
  principalDiscountMinAmount: number;
  
  // Interest/Rent Discount Settings
  interestDiscountEnabled: boolean;
  interestDiscountType: 'percentage' | 'fixed';
  interestDiscountValue: number;
  interestDiscountMinAmount: number;
  
  // General Settings
  isActive: boolean;
  minSettlementAmount: number;
  minRemainingPayments: number;
  maxDiscountAmount?: number;
  maxDiscountPercentage?: number;
  
  // Tiered Discounts (optional)
  tieredDiscounts?: TieredDiscount[];
  
  // Date Range (optional - for promotional periods)
  validFrom?: string;
  validUntil?: string;
  
  // Priority (for multiple settings)
  priority?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TieredDiscount {
  minMonthsEarly: number; // Minimum months early (e.g., 1 = at least 1 month early, 12 = at least 12 months early)
  maxMonthsEarly?: number; // Maximum months early (null/undefined means unlimited)
  principalDiscount: number;
  interestDiscount: number;
  principalDiscountType: 'percentage' | 'fixed';
  interestDiscountType: 'percentage' | 'fixed';
}

export interface SettlementDiscountCalculation {
  originalPrincipal: number;
  originalInterest: number;
  originalTotal: number;
  
  principalDiscount: number;
  interestDiscount: number;
  totalDiscount: number;
  
  discountedPrincipal: number;
  discountedInterest: number;
  finalAmount: number;
  
  // Early settlement metrics
  monthsEarly: number; // How many months early they're paying (total tenure - months into loan)
  monthsIntoLoan: number; // How many months into the loan when settling (for reference)
  settlementDate: string; // When the settlement is happening
  
  settings: SettlementDiscountSettings;
}

