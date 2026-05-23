import type { InsuranceRate } from './insurance-rate.model';

export interface Offer {
  id: string;
  name: string;
  annualRentRate: number;
  annualRentRateFunder: number;
  // Reference to Insurance Rate product (preferred)
  insuranceRateId?: string;
  insuranceRate?: InsuranceRate; // Populated when fetching with relations
  // Legacy fields (deprecated - kept for backward compatibility)
  annualInsuranceRate?: number;
  annualInsuranceRateProvider?: number;
  isDefault: boolean;
  status: 'active' | 'deactive';
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}
