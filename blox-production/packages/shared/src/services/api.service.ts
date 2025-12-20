import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../config/app.config';
import type { ApiResponse } from '../models/api.model';
import { supabase } from './supabase.service';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: Config.base_url,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 30000, // 30 seconds timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Get token from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        // Fallback to localStorage for backward compatibility
        const fallbackToken = localStorage.getItem('token') || localStorage.getItem('customer_token');
        const finalToken = token || fallbackToken;
        
        if (finalToken && config.headers) {
          config.headers.Authorization = `Bearer ${finalToken}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError<ApiResponse>) => {
        if (error.response) {
          const { status } = error.response;

          if (status === 401) {
            // Unauthorized - sign out from Supabase and clear local storage
            await supabase.auth.signOut();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('customer_token');
            localStorage.removeItem('customer_user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('customer_token');
            sessionStorage.removeItem('customer_user');
            window.location.href = '/auth/login';
          } else if (status === 403) {
            // Forbidden - sign out from Supabase and clear local storage
            await supabase.auth.signOut();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('customer_token');
            localStorage.removeItem('customer_user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('customer_token');
            sessionStorage.removeItem('customer_user');
            window.location.reload();
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    // Type guard for Axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: ApiResponse } };
      const apiError = axiosError.response?.data;
      return new Error(apiError?.message || 'An error occurred');
    }
    
    // Type guard for network errors
    if (error && typeof error === 'object' && 'request' in error) {
      return new Error('Network error. Please check your connection.');
    }
    
    // Standard Error object
    if (error instanceof Error) {
      return error;
    }
    
    return new Error('An unexpected error occurred');
  }

  // File upload helper
  async uploadFile(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      };

      const response = await this.api.post<ApiResponse>(url, formData, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const apiService = new ApiService();
