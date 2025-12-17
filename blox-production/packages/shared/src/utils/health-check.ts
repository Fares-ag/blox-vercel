/**
 * Health check utilities for monitoring application and service health
 */

import { supabase } from '../services/supabase.service';
import { loggingService } from '../services/logging.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    };
  };
  timestamp: string;
}

/**
 * Perform health check on Supabase connection
 * Uses a simple query that should work with RLS (public read access to active products)
 */
async function checkSupabase(): Promise<{ status: 'pass' | 'fail'; message?: string; responseTime?: number }> {
  const startTime = Date.now();
  try {
    // Use products table with status filter - should work with public read policy for active products
    // If RLS blocks this, we'll catch the error
    const { error } = await supabase
      .from('products')
      .select('id')
      .eq('status', 'active')
      .limit(1);
    
    const responseTime = Date.now() - startTime;

    if (error) {
      // If it's a permission error, that's actually okay - it means RLS is working
      // We just need to verify the connection works
      if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
        // Try a simpler connection test
        const { error: connError } = await supabase.from('products').select('id').limit(0);
        if (connError && !connError.message?.includes('permission')) {
          return {
            status: 'fail',
            message: `Connection error: ${connError.message}`,
            responseTime,
          };
        }
        // Permission error is expected with secure RLS - connection is working
        return {
          status: 'pass',
          message: 'Connection verified (RLS active)',
          responseTime,
        };
      }
      
      return {
        status: 'fail',
        message: error.message,
        responseTime,
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error: any) {
    return {
      status: 'fail',
      message: error.message || 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check browser storage availability
 */
function checkStorage(): { status: 'pass' | 'fail'; message?: string } {
  try {
    const testKey = '__health_check__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return { status: 'pass' };
  } catch (error: any) {
    return {
      status: 'fail',
      message: 'LocalStorage not available',
    };
  }
}

/**
 * Check network connectivity
 */
async function checkNetwork(): Promise<{ status: 'pass' | 'fail'; message?: string; responseTime?: number }> {
  const startTime = Date.now();
  try {
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    });
    const responseTime = Date.now() - startTime;
    return {
      status: 'pass',
      responseTime,
    };
  } catch (error: any) {
    return {
      status: 'fail',
      message: 'Network connectivity issue',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {};

  // Check Supabase
  checks.supabase = await checkSupabase();

  // Check storage
  checks.storage = checkStorage();

  // Check network
  checks.network = await checkNetwork();

  // Determine overall status
  const failedChecks = Object.values(checks).filter((check) => check.status === 'fail');
  let status: 'healthy' | 'degraded' | 'unhealthy';

  if (failedChecks.length === 0) {
    status = 'healthy';
  } else if (failedChecks.length === 1 && checks.network?.status === 'fail') {
    // Network failure is less critical if other services work
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  const result: HealthCheckResult = {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };

  // Log health check result
  if (status !== 'healthy') {
    loggingService.warn('Health check failed', result);
  }

  return result;
}

/**
 * Start periodic health checks
 */
export function startHealthCheckMonitoring(intervalMs: number = 60000) {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const check = async () => {
    const result = await performHealthCheck();
    if (result.status === 'unhealthy') {
      loggingService.error('Application health check failed', result);
    }
  };

  // Perform initial check
  check();

  // Set up periodic checks
  intervalId = setInterval(check, intervalMs);

  return {
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}

