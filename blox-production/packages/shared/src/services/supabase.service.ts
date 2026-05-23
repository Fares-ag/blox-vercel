import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('âš ï¸ Supabase URL or Anon Key not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

// Create singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'blox-supabase-auth', // Unique storage key to prevent conflicts
      },
    });
  }
  return supabaseInstance;
})();

// Helper function to handle Supabase responses
export const handleSupabaseResponse = <T>(response: { error?: { message?: string } | null; data?: T | null }): T => {
  // Supabase JS responses use `error: PostgrestError | null` and `data: T | null`.
  if (response.error) {
    throw new Error(response.error.message || 'An error occurred');
  }
  return response.data as T;
};

// Helper to convert Supabase row to our model format
export const mapSupabaseRow = <T>(row: any): T => {
  if (!row || typeof row !== 'object') {
    return row as T;
  }

  // Convert snake_case to camelCase and handle nested objects
  const mapped: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }

    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Handle arrays
    if (Array.isArray(value)) {
      mapped[camelKey] = value.map(item => 
        typeof item === 'object' && item !== null ? mapSupabaseRow(item) : item
      );
    }
    // Handle nested objects (but not Date objects or JSONB arrays)
    else if (typeof value === 'object' && !(value instanceof Date) && !(value instanceof String)) {
      // Check if it's a JSONB object (has keys)
      if (Object.keys(value).length > 0) {
        mapped[camelKey] = mapSupabaseRow(value);
      } else {
        mapped[camelKey] = value;
      }
    } else {
      mapped[camelKey] = value;
    }
  }
  
  return mapped as T;
};

