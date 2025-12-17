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
}

export interface DashboardChartData {
  paid: number;
  unpaid: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
