export interface ApiResponse<T = any> {
  /**
   * Optional HTTP-like status code (not always applicable for Supabase/local flows).
   * Most callers in this repo use `status` instead.
   */
  statusCode?: number;
  status: 'SUCCESS' | 'ERROR';
  data?: T;
  message?: string;
  error?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
