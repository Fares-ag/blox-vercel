/**
 * Optimized Supabase service with connection pooling and query optimization
 */

import { supabase } from './supabase.service';
import { loggingService } from './logging.service';
import type { ApiResponse } from '../models/api.model';

/**
 * Optimized query builder with automatic retry and error handling
 */
class OptimizedSupabaseService {
  /**
   * Execute query with automatic retry on connection errors
   */
  private async executeWithRetry<T>(
    queryFn: () => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
    retries = 2
  ): Promise<{ data: T | null; error: { code?: string; message?: string } | null }> {
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await queryFn();
        
        // If successful or non-retryable error, return immediately
        if (!result.error || this.isNonRetryableError(result.error)) {
          return result;
        }

        lastError = result.error;

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      } catch (error: unknown) {
        const errorObj = error && typeof error === 'object' && ('code' in error || 'message' in error)
          ? error as { code?: string; message?: string }
          : { message: error instanceof Error ? error.message : 'Unknown error' };
        lastError = errorObj;
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    return { data: null, error: lastError };
  }

  /**
   * Check if error is non-retryable (e.g., validation error)
   */
  private isNonRetryableError(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false;
    
    // Non-retryable error codes
    const nonRetryableCodes = ['23505', '23503', '23502', 'PGRST116'];
    return nonRetryableCodes.some(code => 
      error.code === code || error.message?.includes(code)
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Optimized batch query for multiple records
   * Uses pagination to avoid large result sets
   */
  async batchQuery<T>(
    table: string,
    filters: Record<string, unknown> = {},
    pageSize = 100,
    maxPages = 10
  ): Promise<ApiResponse<T[]>> {
    try {
      const allResults: T[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore && page < maxPages) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from(table)
          .select('*')
          .range(from, to)
          .order('created_at', { ascending: false });

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }

        const { data, error } = await this.executeWithRetry<unknown[]>(() => query as PromiseLike<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>);

        if (error) {
          loggingService.error(`Batch query error on page ${page}`, { table, error });
          return {
            status: 'ERROR',
            message: error.message || 'Failed to fetch data',
            data: allResults,
          };
        }

        if (Array.isArray(data) && data.length > 0) {
          allResults.push(...(data as T[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return {
        status: 'SUCCESS',
        data: allResults,
        message: `Fetched ${allResults.length} records`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      loggingService.error('Batch query failed', { table, error });
      return {
        status: 'ERROR',
        message: errorMessage,
        data: [],
      };
    }
  }

  /**
   * Optimized count query
   * Uses estimated count for better performance on large tables
   */
  async count(
    table: string,
    filters: Record<string, unknown> = {},
    useEstimate = false
  ): Promise<ApiResponse<number>> {
    try {
      if (useEstimate) {
        // Use PostgreSQL's estimated row count (faster but approximate)
        const { data, error } = await supabase.rpc('get_table_estimate', {
          table_name: table,
        });

        if (error) {
          // Fallback to exact count
          return this.exactCount(table, filters);
        }

        return {
          status: 'SUCCESS',
          data: data || 0,
          message: 'Count retrieved successfully',
        };
      }

      return this.exactCount(table, filters);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to count records';
      loggingService.error('Count query failed', { table, error });
      return {
        status: 'ERROR',
        message: errorMessage,
        data: 0,
      };
    }
  }

  /**
   * Exact count query
   */
  private async exactCount(
    table: string,
    filters: Record<string, unknown> = {}
  ): Promise<ApiResponse<number>> {
    try {
      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return {
        status: 'SUCCESS',
        data: count || 0,
        message: 'Count retrieved successfully',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to count records';
      return {
        status: 'ERROR',
        message: errorMessage,
        data: 0,
      };
    }
  }

  /**
   * Optimized upsert with conflict handling
   */
  async upsert<T>(
    table: string,
    data: Partial<T>,
    conflictColumn: string = 'id'
  ): Promise<ApiResponse<T>> {
    try {
      const { data: result, error } = await this.executeWithRetry(() =>
        supabase
          .from(table)
          .upsert(data, { onConflict: conflictColumn })
          .select()
          .single()
      );

      if (error) {
        throw error;
      }

      return {
        status: 'SUCCESS',
        data: result as T,
        message: 'Record upserted successfully',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upsert record';
      loggingService.error('Upsert failed', { table, error });
      return {
        status: 'ERROR',
        message: errorMessage,
        data: {} as T,
      };
    }
  }
}

export const optimizedSupabaseService = new OptimizedSupabaseService();

