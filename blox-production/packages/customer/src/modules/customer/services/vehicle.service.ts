import { supabaseApiService } from '@shared/services';
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
    // Delegate to Supabase products API and then filter client-side
    const response = await supabaseApiService.getProducts();
    if (response.status !== 'SUCCESS' || !response.data) {
      return {
        status: 'ERROR',
        message: response.message || 'Failed to load vehicles from Supabase',
        data: [],
      };
    }

    // Only show active vehicles (admin can control visibility via status field)
    let vehicles = (response.data as Product[]).filter((v) => v.status === 'active');

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        vehicles = vehicles.filter(
          (v) =>
            v.make.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            v.id.toLowerCase().includes(q)
        );
      }
      if (filters.make) vehicles = vehicles.filter((v) => v.make === filters.make);
      if (filters.model) vehicles = vehicles.filter((v) => v.model === filters.model);
      if (filters.condition) vehicles = vehicles.filter((v) => v.condition === filters.condition);
      if (filters.minPrice) vehicles = vehicles.filter((v) => v.price >= filters.minPrice!);
      if (filters.maxPrice) vehicles = vehicles.filter((v) => v.price <= filters.maxPrice!);
      if (filters.minYear) vehicles = vehicles.filter((v) => v.modelYear >= filters.minYear!);
      if (filters.maxYear) vehicles = vehicles.filter((v) => v.modelYear <= filters.maxYear!);
    }

    return {
      status: 'SUCCESS',
      data: vehicles,
      message: 'Vehicles loaded from Supabase',
    };
  }

  /**
   * Get vehicle by ID (public - no auth required)
   */
  async getVehicleById(id: string): Promise<ApiResponse<Product>> {
    // Use Supabase products table directly
    const response = await supabaseApiService.getProductById(id);
    if (response.status !== 'SUCCESS' || !response.data) {
      return {
        status: 'ERROR',
        message: response.message || 'Failed to load vehicle from Supabase',
        data: {} as Product,
      };
    }
    return response;
  }

  /**
   * Get available makes (for filter dropdown)
   */
  async getMakes(): Promise<ApiResponse<string[]>> {
    const response = await supabaseApiService.getProducts();
    if (response.status !== 'SUCCESS' || !response.data) {
      return {
        status: 'ERROR',
        message: response.message || 'Failed to load makes from Supabase',
        data: [],
      };
    }
    // Only show makes from active vehicles
    const activeVehicles = response.data.filter((v) => v.status === 'active');
    const makes = Array.from(new Set(activeVehicles.map((v) => v.make))).sort();
    return { status: 'SUCCESS', data: makes, message: 'Makes loaded from Supabase' };
  }

  /**
   * Get models for a specific make
   */
  async getModelsByMake(make: string): Promise<ApiResponse<string[]>> {
    const response = await supabaseApiService.getProducts();
    if (response.status !== 'SUCCESS' || !response.data) {
      return {
        status: 'ERROR',
        message: response.message || 'Failed to load models from Supabase',
        data: [],
      };
    }
    // Only show models from active vehicles
    const activeVehicles = response.data.filter((v) => v.status === 'active');
    const models = Array.from(
      new Set(activeVehicles.filter((v) => v.make === make).map((v) => v.model))
    ).sort();
    return { status: 'SUCCESS', data: models, message: 'Models loaded from Supabase' };
  }
}

export const vehicleService = new VehicleService();

