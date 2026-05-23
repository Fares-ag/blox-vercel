export interface InsuranceRate {
  id: string;
  name: string;
  description?: string;
  annualRate: number;
  providerRate: number;
  coverageType: 'comprehensive' | 'third-party' | 'full';
  minVehicleValue?: number;
  maxVehicleValue?: number;
  minTenure?: number;
  maxTenure?: number;
  status: 'active' | 'inactive';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

