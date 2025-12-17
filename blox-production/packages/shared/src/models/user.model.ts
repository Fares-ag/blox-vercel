export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  nationalId?: string;
  nationality?: string;
  gender?: string;
  /** Authorization role from Supabase user metadata (e.g. 'admin' | 'customer'). */
  role?: string;
  /** Optional permission list for future fine-grained RBAC. */
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
  lastLoginAt?: string;
  totalApplications?: number;
  activeApplications?: number;
  totalPayments?: number;
  membershipStatus?: 'active' | 'inactive' | 'none';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
