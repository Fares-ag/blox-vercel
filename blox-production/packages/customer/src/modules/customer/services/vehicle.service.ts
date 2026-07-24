import { supabaseApiService } from '@shared/services';
import type { Product } from '@shared/models/product.model';
import type { ApiResponse } from '@shared/models/api.model';
import {
  CATALOG_SEED_VEHICLES,
  mergeCatalogWithSeed,
} from '../features/vehicles/data/catalog-seed';

/**
 * Soft default max for the customer price-range filter slider (QAR).
 * This is NOT a hard catalog cap — premium partner inventory (e.g. Audi) can
 * exceed it. Customers can raise the max filter to see higher-priced vehicles.
 */
export const CUSTOMER_MAX_VEHICLE_PRICE_QAR = 1_000_000;

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
  /** Reserved vehicle ids excluded before range (pre-range). */
  excludeIds?: string[];
}

class VehicleService {
  /**
   * Server-paged active vehicles (public — no auth required for RLS active read).
   */
  async getVehicles(
    filters?: VehicleFilters
  ): Promise<ApiResponse<Product[]> & { count?: number | null }> {
    const page = Math.max(filters?.page ?? 1, 1);
    const limit = Math.max(filters?.limit ?? 12, 1);
    const offset = (page - 1) * limit;

    const response = await supabaseApiService.queryProducts({
      limit,
      offset,
      status: ['active'],
      make: filters?.make ? [filters.make] : undefined,
      model: filters?.model ? [filters.model] : undefined,
      condition: filters?.condition ? [filters.condition] : undefined,
      priceMin: filters?.minPrice,
      priceMax: filters?.maxPrice,
      modelYearMin: filters?.minYear,
      modelYearMax: filters?.maxYear,
      search: filters?.search,
      excludeIds: filters?.excludeIds,
    });

    if (response.status !== 'SUCCESS' || !response.data) {
      return {
        status: 'ERROR',
        message: response.message || 'Failed to load vehicles from Supabase',
        data: [],
        count: 0,
      };
    }

    // Seed only fills missing images on returned page rows — never invents inventory.
    const vehicles = mergeCatalogWithSeed(response.data as Product[]);

    return {
      status: 'SUCCESS',
      data: vehicles,
      count: response.count ?? vehicles.length,
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
    if (response.data.status !== 'active') {
      return {
        status: 'ERROR',
        message: 'This vehicle is not available',
        data: {} as Product,
      };
    }
    const seeded = CATALOG_SEED_VEHICLES.find((v) => v.id === id);
    if (!seeded) {
      return {
        status: 'SUCCESS',
        data: response.data,
        message: response.message,
      };
    }
    // Remote SoT for price/status; seed only fills missing images
    const remoteImages = Array.isArray(response.data.images)
      ? response.data.images.filter(Boolean)
      : [];
    const seedImages = Array.isArray(seeded.images) ? seeded.images.filter(Boolean) : [];
    return {
      status: 'SUCCESS',
      data: {
        ...seeded,
        ...response.data,
        id: response.data.id,
        images: remoteImages.length > 0 ? remoteImages : seedImages,
      },
      message: response.message,
    };
  }

  /**
   * Distinct makes via facet RPC (no full-table product download).
   */
  async getMakes(): Promise<ApiResponse<string[]>> {
    return supabaseApiService.getProductMakes('active');
  }

  /**
   * Distinct models for a make via facet RPC.
   */
  async getModelsByMake(make: string): Promise<ApiResponse<string[]>> {
    return supabaseApiService.getProductModels(make, 'active');
  }
}

export const vehicleService = new VehicleService();
