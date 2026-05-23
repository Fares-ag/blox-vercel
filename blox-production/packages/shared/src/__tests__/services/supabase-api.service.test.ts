import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseApiService } from '../../services/supabase-api.service';
import { supabase } from '../../services/supabase.service';
import { supabaseCache } from '../../services/supabase-cache.service';

// Mock Supabase
vi.mock('../../services/supabase.service', () => ({
  supabase: {
    from: vi.fn(),
  },
  handleSupabaseResponse: vi.fn((response: any) => {
    if (response.error) {
      throw new Error(response.error.message || 'An error occurred');
    }
    return response.data;
  }),
  mapSupabaseRow: vi.fn((row: any) => {
    if (!row || typeof row !== 'object') {
      return row;
    }
    const mapped: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      mapped[camelKey] = value;
    }
    return mapped;
  }),
}));

describe('SupabaseApiService', () => {
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseCache.clear();
    
    // Create a chainable query builder mock
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as any);
  });

  describe('getProducts', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = [
        {
          id: '1',
          make: 'Toyota',
          model: 'Camry',
          model_year: 2023,
          price: 30000,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({
        data: mockProducts,
        error: null,
      });

      const result = await supabaseApiService.getProducts();

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(supabase.from).toHaveBeenCalledWith('products');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle errors when fetching products', async () => {
      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await supabaseApiService.getProducts();

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('error');
    });
  });

  describe('getProductById', () => {
    it('should fetch a single product by id', async () => {
      const mockProduct = {
        id: '1',
        make: 'Toyota',
        model: 'Camry',
        model_year: 2023,
        price: 30000,
        status: 'active',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const result = await supabaseApiService.getProductById('1');

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1');
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const newProduct = {
        make: 'Honda',
        model: 'Accord',
        trim: 'EX',
        modelYear: 2024,
        condition: 'new' as const,
        engine: '2.0L',
        color: 'Blue',
        mileage: 0,
        price: 35000,
        images: [],
        documents: [],
        attributes: [],
        status: 'active' as const,
      };

      const mockCreatedProduct = {
        id: '2',
        ...newProduct,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockCreatedProduct,
        error: null,
      });

      const result = await supabaseApiService.createProduct(newProduct);

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });
  });

  describe('getApplications', () => {
    it('should fetch applications successfully', async () => {
      const mockApplications = [
        {
          id: '1',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+1234567890',
          status: 'draft',
          loan_amount: 50000,
          down_payment: 10000,
          created_at: new Date().toISOString(),
        },
      ];

      mockQueryBuilder.order.mockResolvedValue({
        data: mockApplications,
        error: null,
      });

      const result = await supabaseApiService.getApplications();

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(supabase.from).toHaveBeenCalledWith('applications');
    });
  });
});

