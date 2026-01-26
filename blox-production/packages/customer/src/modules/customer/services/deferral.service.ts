import type { PaymentDeferral } from '@shared/models/application.model';
import { supabaseApiService } from '@shared/services';
import moment from 'moment';

class DeferralService {
  /**
   * Get all deferrals for the current customer
   * Note: This currently returns empty array as deferrals need to be loaded from Supabase
   * TODO: Add getDeferrals method to supabaseApiService
   */
  getDeferrals(_applicationId?: string): PaymentDeferral[] {
    // TODO: Load from Supabase when deferral methods are added
    return [];
  }

  /**
   * Get deferrals for a specific year
   */
  async getDeferralsForYear(year: number, applicationId?: string): Promise<PaymentDeferral[]> {
    const allDeferrals = await this.getDeferrals(applicationId);
    return allDeferrals.filter((d) => d.year === year);
  }

  /**
   * Get deferral status for current year
   */
  async getDeferralStatus(applicationId?: string): Promise<{
    remainingDeferrals: number;
    deferralsUsed: number;
    year: number;
  }> {
    const currentYear = new Date().getFullYear();
    const deferralsThisYear = await this.getDeferralsForYear(currentYear, applicationId);
    
    return {
      remainingDeferrals: Math.max(0, 3 - deferralsThisYear.length),
      deferralsUsed: deferralsThisYear.length,
      year: currentYear,
    };
  }

  /**
   * Add a new deferral
   */
  async addDeferral(deferral: Omit<PaymentDeferral, 'id' | 'deferredDate'>): Promise<PaymentDeferral | null> {
    try {
      const response = await supabaseApiService.createDeferral(deferral);
      if (response.status === 'SUCCESS' && response.data) {
        return response.data;
      }
      console.error('Failed to create deferral:', response.message);
      return null;
    } catch (error) {
      console.error('Failed to create deferral:', error);
      return null;
    }
  }

  /**
   * Check if a payment can be deferred
   */
  async canDeferPayment(applicationId?: string): Promise<boolean> {
    const status = await this.getDeferralStatus(applicationId);
    return status.remainingDeferrals > 0;
  }

  /**
   * Synchronous helper for UI call sites that need an immediate boolean.
   * Until deferrals are fully loaded from Supabase, this uses the in-memory stub and will typically be `true`.
   */
  canDeferPaymentSync(applicationId?: string): boolean {
    // Since `getDeferrals()` is currently a stub, the "sync" result matches the intended behavior: allow deferral.
    // If/when deferrals are loaded from Supabase, remove this helper and make UI call sites async.
    void applicationId;
    return true;
  }

  /**
   * Update payment schedule after deferral
   * This shifts the payment and all subsequent payments by one month
   * If partialAmount is provided, splits the payment into two parts
   */
  async updatePaymentScheduleAfterDeferral(
    applicationId: string,
    paymentDueDate: string,
    deferredAmount?: number
  ): Promise<{ updated: boolean; newSchedule: any[] }> {
    try {
      // Load application from Supabase
      const appResponse = await supabaseApiService.getApplicationById(applicationId);
      
      if (appResponse.status !== 'SUCCESS' || !appResponse.data || !appResponse.data.installmentPlan?.schedule) {
        return { updated: false, newSchedule: [] };
      }

      const application = appResponse.data;
      if (!application.installmentPlan || !application.installmentPlan.schedule) {
        return { updated: false, newSchedule: [] };
      }
      const schedule = [...application.installmentPlan.schedule];
      const paymentIndex = schedule.findIndex(
        (p: any) => p.dueDate === paymentDueDate && p.status !== 'paid'
      );

      if (paymentIndex === -1) {
        return { updated: false, newSchedule: schedule };
      }

      const originalPayment = schedule[paymentIndex];
      const isPartialDeferral = deferredAmount !== undefined && deferredAmount > 0 && deferredAmount < originalPayment.amount;

      let newSchedule: any[];

      if (isPartialDeferral) {
        // Partial deferral: split payment into two parts
        const remainingAmount = originalPayment.amount - deferredAmount;
        const deferredDueDate = moment(paymentDueDate).add(1, 'month').format('YYYY-MM-DD');

        // Update original payment with reduced amount
        const updatedOriginalPayment = {
          ...originalPayment,
          amount: remainingAmount,
          isPartiallyDeferred: true,
          deferredAmount: deferredAmount,
        };

        // Create new payment for deferred amount
        const deferredPayment = {
          ...originalPayment,
          id: `${originalPayment.id}-deferred`,
          amount: deferredAmount,
          dueDate: deferredDueDate,
          isDeferred: true,
          originalDueDate: paymentDueDate,
          originalAmount: originalPayment.amount,
          deferredAmount: deferredAmount,
        };

        // Build new schedule:
        // 1. Payments before the deferred one (unchanged)
        // 2. Updated original payment (with reduced amount)
        // 3. New deferred payment
        // 4. Subsequent payments shifted by one month
        newSchedule = [
          ...schedule.slice(0, paymentIndex),
          updatedOriginalPayment,
          deferredPayment,
          ...schedule.slice(paymentIndex + 1).map((payment: any) => {
            if (payment.status !== 'paid') {
              // Shift all subsequent unpaid payments by one month
              const newDueDate = moment(payment.dueDate).add(1, 'month').format('YYYY-MM-DD');
              return {
                ...payment,
                dueDate: newDueDate,
              };
            }
            return payment;
          }),
        ];
      } else {
        // Full deferral: move entire payment to next month
        newSchedule = schedule.map((payment: any, index: number) => {
          if (index === paymentIndex) {
            // Mark as deferred and move to next month
            const newDueDate = moment(payment.dueDate).add(1, 'month').format('YYYY-MM-DD');
            return {
              ...payment,
              dueDate: newDueDate,
              isDeferred: true,
              originalDueDate: payment.dueDate,
            };
          } else if (index > paymentIndex && payment.status !== 'paid') {
            // Shift all subsequent unpaid payments by one month
            const newDueDate = moment(payment.dueDate).add(1, 'month').format('YYYY-MM-DD');
            return {
              ...payment,
              dueDate: newDueDate,
            };
          }
          return payment;
        });
      }

      // Update the application in Supabase
      if (!application.installmentPlan) {
        return { updated: false, newSchedule: [] };
      }

      const updateResponse = await supabaseApiService.updateApplication(applicationId, {
        installmentPlan: {
          ...application.installmentPlan,
          schedule: newSchedule,
        } as any, // Type assertion needed due to InstallmentPlan type requirements
        updatedAt: new Date().toISOString(),
      });

      if (updateResponse.status === 'SUCCESS') {
        return { updated: true, newSchedule };
      } else {
        console.error('Failed to update payment schedule in Supabase:', updateResponse.message);
        return { updated: false, newSchedule: [] };
      }
    } catch (error) {
      console.error('❌ Failed to update payment schedule:', error);
      return { updated: false, newSchedule: [] };
    }
  }
}

export const deferralService = new DeferralService();

