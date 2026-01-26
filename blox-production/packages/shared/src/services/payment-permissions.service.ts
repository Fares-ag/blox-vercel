import { supabase } from './supabase.service';
import { devLogger } from '../utils/logger.util';

/**
 * Payment permissions for an application.
 *
 * Source of truth:
 * - `public.applications.company_id` -> `public.companies.can_pay`
 *
 * Note:
 * - We intentionally avoid reading tables directly from the client to prevent RLS mismatches.
 */
class PaymentPermissionsService {
  async getCanPayForApplication(applicationId: string): Promise<boolean> {
    try {
      if (!applicationId) return false;
      const { data, error } = await supabase.rpc('current_user_can_pay_for_application', {
        p_application_id: applicationId,
      });
      if (error) {
        devLogger.error('Payment permission RPC failed (current_user_can_pay_for_application)', error, {
          applicationId,
        });
        return false;
      }
      return Boolean(data);
    } catch (e) {
      // Default to deny on unexpected failures.
      devLogger.error('Unexpected error in getCanPayForApplication', e, { applicationId });
      return false;
    }
  }
}

export const paymentPermissionsService = new PaymentPermissionsService();

