import { supabase } from './supabase.service';
import type {
  RevenueForecast,
  ConversionFunnelStage,
  PaymentCollectionRate,
  CustomerLifetimeValue,
  AnalyticsData,
  DateRange,
} from '../models/dashboard.model';

class AnalyticsService {
  /**
   * Get revenue forecast data
   */
  async getRevenueForecast(
    dateRange: DateRange,
    forecastMonths: number = 6
  ): Promise<RevenueForecast[]> {
    try {
      const { data, error } = await supabase.rpc('get_revenue_forecast', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        forecast_months: forecastMonths,
      });

      if (error) {
        console.error('Failed to load revenue forecast:', error);
        throw new Error(error.message || 'Failed to load revenue forecast');
      }

      return (data || []).map((row: any) => ({
        period: row.period,
        projectedRevenue: Number(row.projected_revenue ?? 0),
        actualRevenue: Number(row.actual_revenue ?? 0),
        forecastedRevenue: Number(row.forecasted_revenue ?? 0),
      }));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to fetch revenue forecast');
      if (import.meta.env.DEV) {
        console.error('Error fetching revenue forecast:', err);
      }
      throw err;
    }
  }

  /**
   * Get application conversion funnel
   */
  async getConversionFunnel(dateRange: DateRange): Promise<ConversionFunnelStage[]> {
    try {
      const { data, error } = await supabase.rpc('get_conversion_funnel', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });

      if (error) {
        console.error('Failed to load conversion funnel:', error);
        throw new Error(error.message || 'Failed to load conversion funnel');
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        stage: String(row.stage ?? ''),
        count: Number(row.count ?? 0),
        percentage: Number(row.percentage ?? 0),
        dropOffRate: row.drop_off_rate ? Number(row.drop_off_rate) : undefined,
      }));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to fetch conversion funnel');
      if (import.meta.env.DEV) {
        console.error('Error fetching conversion funnel:', err);
      }
      throw err;
    }
  }

  /**
   * Get payment collection rates
   */
  async getPaymentCollectionRates(
    dateRange: DateRange
  ): Promise<PaymentCollectionRate[]> {
    try {
      const { data, error } = await supabase.rpc('get_payment_collection_rates', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });

      if (error) {
        console.error('Failed to load payment collection rates:', error);
        throw new Error(error.message || 'Failed to load payment collection rates');
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        period: String(row.period ?? ''),
        totalDue: Number(row.total_due ?? 0),
        totalCollected: Number(row.total_collected ?? 0),
        collectionRate: Number(row.collection_rate ?? 0),
        overdueAmount: Number(row.overdue_amount ?? 0),
        overdueRate: Number(row.overdue_rate ?? 0),
      }));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to fetch payment collection rates');
      if (import.meta.env.DEV) {
        console.error('Error fetching payment collection rates:', err);
      }
      throw err;
    }
  }

  /**
   * Get customer lifetime value data
   */
  async getCustomerLifetimeValue(limit: number = 50): Promise<CustomerLifetimeValue[]> {
    try {
      const { data, error } = await supabase.rpc('get_customer_lifetime_value', {
        limit_count: limit,
      });

      if (error) {
        console.error('Failed to load customer lifetime value:', error);
        throw new Error(error.message || 'Failed to load customer lifetime value');
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        customerEmail: String(row.customer_email ?? ''),
        customerName: String(row.customer_name ?? row.customer_email ?? ''),
        totalRevenue: Number(row.total_revenue ?? 0),
        totalApplications: Number(row.total_applications ?? 0),
        averageApplicationValue: Number(row.average_application_value ?? 0),
        averagePaymentAmount: Number(row.average_payment_amount ?? 0),
        totalPayments: Number(row.total_payments ?? 0),
        lastPaymentDate: (row.last_payment_date as string | null) ?? null,
        customerSince: String(row.customer_since ?? ''),
        clv: Number(row.clv ?? 0),
      }));
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to fetch customer lifetime value');
      if (import.meta.env.DEV) {
        console.error('Error fetching customer lifetime value:', err);
      }
      throw err;
    }
  }

  /**
   * Get all analytics data at once
   */
  async getAllAnalyticsData(
    dateRange: DateRange,
    forecastMonths: number = 6,
    clvLimit: number = 50
  ): Promise<AnalyticsData> {
    try {
      const [revenueForecast, conversionFunnel, paymentCollectionRates, customerLifetimeValues] =
        await Promise.all([
          this.getRevenueForecast(dateRange, forecastMonths),
          this.getConversionFunnel(dateRange),
          this.getPaymentCollectionRates(dateRange),
          this.getCustomerLifetimeValue(clvLimit),
        ]);

      // Get top 10 customers by CLV
      const topCustomers = customerLifetimeValues
        .sort((a, b) => b.clv - a.clv)
        .slice(0, 10);

      return {
        revenueForecast,
        conversionFunnel,
        paymentCollectionRates,
        customerLifetimeValues,
        topCustomers,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to fetch all analytics data');
      if (import.meta.env.DEV) {
        console.error('Error fetching all analytics data:', err);
      }
      throw err;
    }
  }
}

export const analyticsService = new AnalyticsService();
