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

