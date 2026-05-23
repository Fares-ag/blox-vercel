/**
 * Test utility for Supabase - helps verify connection and create test data
 */
import { supabaseApiService } from '../services';
import type { Product } from '../models/product.model';

/**
 * Create a test product in Supabase
 * Useful for verifying the connection works
 */
export const createTestProduct = async (): Promise<void> => {
  try {
    const testProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      make: 'Toyota',
      model: 'Camry',
      trim: 'XLE',
      modelYear: 2024,
      condition: 'new',
      engine: '2.5L 4-Cylinder',
      color: 'White',
      mileage: 0,
      price: 35000,
      status: 'active',
      images: [],
      documents: [],
      attributes: [],
      description: 'Test product created to verify Supabase connection'
    };

    console.log('🧪 Creating test product...');
    const response = await supabaseApiService.createProduct(testProduct);
    
    if (response.status === 'SUCCESS') {
      console.log('✅ Test product created successfully!', response.data);
    } else {
      console.error('❌ Failed to create test product:', response.message);
    }
  } catch (error: any) {
    console.error('❌ Error creating test product:', error);
  }
};

/**
 * Test Supabase connection
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Testing Supabase connection...');
    const response = await supabaseApiService.getProducts();
    
    if (response.status === 'SUCCESS') {
      console.log(`✅ Supabase connection successful! Found ${response.data?.length || 0} products.`);
      return true;
    } else {
      console.error('❌ Supabase connection failed:', response.message);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
};

