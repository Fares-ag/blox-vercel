export interface DashboardStats {
  projectedInsurance: number;
  projectedFunding: number;
  projectedRevenue: number;
  realRevenue: number;
  paidInstallments: number;
  unpaidInstallments: number;
  userBloxPercentage: number;
  companyBloxPercentage: number;
  totalAssetsOwnership: number; // 100%
  customerOwnershipPercentage: number; // 73.33%
  bloxOwnershipPercentage: number; // 26.67%
  activeApplications: number;
  monthlyPayable: number;
  monthlyReceivable: number;
  profitability: number; // percentage
   deferralsInPeriod: number;
   customersNearDeferralLimit: number;
}

export interface DashboardChartData {
  paid: number;
  unpaid: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Enhanced Analytics Models
export interface RevenueForecast {
  period: string; // 'YYYY-MM' format
  projectedRevenue: number;
  actualRevenue: number;
  forecastedRevenue: number;
}

export interface ConversionFunnelStage {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate?: number;
}

export interface PaymentCollectionRate {
  period: string;
  totalDue: number;
  totalCollected: number;
  collectionRate: number; // percentage
  overdueAmount: number;
  overdueRate: number; // percentage
}

export interface CustomerLifetimeValue {
  customerEmail: string;
  customerName: string;
  totalRevenue: number;
  totalApplications: number;
  averageApplicationValue: number;
  averagePaymentAmount: number;
  totalPayments: number;
  lastPaymentDate: string | null;
  customerSince: string;
  clv: number; // Customer Lifetime Value
}

export interface AnalyticsData {
  revenueForecast: RevenueForecast[];
  conversionFunnel: ConversionFunnelStage[];
  paymentCollectionRates: PaymentCollectionRate[];
  customerLifetimeValues: CustomerLifetimeValue[];
  topCustomers: CustomerLifetimeValue[];
}
