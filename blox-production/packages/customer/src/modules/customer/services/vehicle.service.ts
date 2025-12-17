import { apiService } from '@shared/services/api.service';
import type { Product } from '@shared/models/product.model';
import type { ApiResponse } from '@shared/models/api.model';

export interface VehicleFilters {
  search?: string;
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'new' | 'old';
  minYear?: number;
  maxYear?: number;
  page?: number;
  limit?: number;
}

class VehicleService {
  /**
   * Get all vehicles (public - no auth required)
   */
  async getVehicles(filters?: VehicleFilters): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.make) params.append('make', filters.make);
    if (filters?.model) params.append('model', filters.model);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.condition) params.append('condition', filters.condition);
    if (filters?.minYear) params.append('minYear', filters.minYear.toString());
    if (filters?.maxYear) params.append('maxYear', filters.maxYear.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/customer/vehicles${queryString ? `?${queryString}` : ''}`;
    
    return await apiService.get<Product[]>(url);
  }

  /**
   * Get vehicle by ID (public - no auth required)
   */
  async getVehicleById(id: string): Promise<ApiResponse<Product>> {
    return await apiService.get<Product>(`/customer/vehicles/${id}`);
  }

  /**
   * Get available makes (for filter dropdown)
   */
  async getMakes(): Promise<ApiResponse<string[]>> {
    return await apiService.get<string[]>('/customer/vehicles/makes');
  }

  /**
   * Get models for a specific make
   */
  async getModelsByMake(make: string): Promise<ApiResponse<string[]>> {
    return await apiService.get<string[]>(`/customer/vehicles/models?make=${make}`);
  }
}

export const vehicleService = new VehicleService();

