import { supabaseApiService } from '@shared/services';
import type { Product } from '@shared/models/product.model';
import type { ApiResponse } from '@shared/models/api.model';
import {
  CATALOG_SEED_VEHICLES,
  mergeCatalogWithSeed,
} from '../features/vehicles/data/catalog-seed';

/** Customer catalog cap: hide vehicles priced above this amount (QAR). */
export const CUSTOMER_MAX_VEHICLE_PRICE_QAR = 70_000;

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

    // Merge local Qatar catalog seed (RLS blocks anon product inserts)
    // Cap catalog at 70,000 QAR for the customer browse experience
    let vehicles = mergeCatalogWithSeed(response.data as Product[]).filter(
      (v) => v.status === 'active' && v.price <= CUSTOMER_MAX_VEHICLE_PRICE_QAR
    );

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
      const effectiveMaxPrice = Math.min(
        filters.maxPrice ?? CUSTOMER_MAX_VEHICLE_PRICE_QAR,
        CUSTOMER_MAX_VEHICLE_PRICE_QAR
      );
      vehicles = vehicles.filter((v) => v.price <= effectiveMaxPrice);
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
    // Only products that exist in Supabase are apply-eligible (FK on applications.vehicle_id).
    const response = await supabaseApiService.getProductById(id);
    if (response.status !== 'SUCCESS' || !response.data) {
      return {
        status: 'ERROR',
        message: response.message || 'Vehicle not found',
        data: {} as Product,
      };
    }
    if (
      response.data.status !== 'active' ||
      response.data.price > CUSTOMER_MAX_VEHICLE_PRICE_QAR
    ) {
      return {
        status: 'ERROR',
        message: 'This vehicle is not available',
        data: {} as Product,
      };
    }
    const seeded = CATALOG_SEED_VEHICLES.find((v) => v.id === id);
    return {
      status: 'SUCCESS',
      data: seeded ? { ...response.data, ...seeded, id: response.data.id } : response.data,
      message: response.message,
    };
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
    // Only show makes from active in-cap vehicles (remote + seed)
    const activeVehicles = mergeCatalogWithSeed(response.data).filter(
      (v) => v.status === 'active' && v.price <= CUSTOMER_MAX_VEHICLE_PRICE_QAR
    );
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
    // Only show models from active in-cap vehicles (remote + seed)
    const activeVehicles = mergeCatalogWithSeed(response.data).filter(
      (v) => v.status === 'active' && v.price <= CUSTOMER_MAX_VEHICLE_PRICE_QAR
    );
    const models = Array.from(
      new Set(activeVehicles.filter((v) => v.make === make).map((v) => v.model))
    ).sort();
    return { status: 'SUCCESS', data: models, message: 'Models loaded from Supabase' };
  }
}

export const vehicleService = new VehicleService();

