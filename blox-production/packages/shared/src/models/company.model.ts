export interface Company {
  id: string;
  name: string;
  code?: string;
  description?: string;
  canPay: boolean;
  status: 'active' | 'inactive';
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** At-a-glance Partner Hub row (admin). */
export interface PartnerHubSummary extends Company {
  vehicleCount: number;
  openApplicationCount: number;
  dealerAgentCount: number;
  creditOfficerCount: number;
}

