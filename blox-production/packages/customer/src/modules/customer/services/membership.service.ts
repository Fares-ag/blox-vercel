import type { PaymentDeferral, BloxMembership } from '@shared/models/application.model';
import { MembershipConfig } from '@shared/config/app.config';
import { deferralService } from './deferral.service';
import { supabaseApiService, supabase } from '@shared/services';
import moment from 'moment';

class MembershipService {
  async purchaseMembership(
    applicationId: string,
    membershipType: 'monthly' | 'yearly'
  ): Promise<BloxMembership> {
    // New purchases: monthly only. Legacy yearly rows still load via getMembershipStatus.
    if (!MembershipConfig.allowYearlyPurchase && membershipType !== 'monthly') {
      throw new Error(
        'Yearly membership is no longer available. Please purchase the monthly plan (50 QAR/month).'
      );
    }

    const membership: BloxMembership = {
      isActive: true,
      membershipType: 'monthly',
      purchasedDate: new Date().toISOString(),
      cost: MembershipConfig.costPerMonth,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      await supabaseApiService.updateApplication(applicationId, {
        bloxMembership: membership,
      } as any);
    } catch (error) {
      console.error('Failed to persist Blox membership on application:', error);
      // We still return the membership so the UI reflects the change; Supabase sync can be fixed later.
    }

    return membership;
  }

  async getDeferralStatus(): Promise<{
    remainingDeferrals: number;
    deferralsUsed: number;
    year: number;
  }> {
    // Legacy HTTP API is no longer available; use local deferral tracking.
    return deferralService.getDeferralStatus();
  }

  async deferPayment(
    applicationId: string,
    paymentDueDate: string,
    reason?: string,
    deferredAmount?: number
  ): Promise<PaymentDeferral> {
    // We no longer call a remote API for deferrals; PaymentPage already updates
    // Supabase schedules directly. Here we just create a local deferral record.

    const deferral: PaymentDeferral = {
      id: `DEF${Date.now()}`,
      paymentId: paymentDueDate,
      applicationId,
      originalDueDate: paymentDueDate,
      deferredToDate: moment(paymentDueDate).add(1, 'month').format('YYYY-MM-DD'),
      deferredDate: new Date().toISOString(),
      reason,
      year: new Date().getFullYear(),
    };

    deferralService.addDeferral(deferral);
    return deferral;
  }

  async getMembershipStatus(): Promise<BloxMembership | null> {
    // Determine membership from the customer's latest application in Supabase.
    try {
      const { data: auth } = await supabase.auth.getUser();
      const email = auth?.user?.email;
      if (!email) {
        console.log('getMembershipStatus: no authenticated user');
        return null;
      }

      const applicationsResponse = await supabaseApiService.getApplications();
      if (applicationsResponse.status !== 'SUCCESS' || !applicationsResponse.data) {
        console.log('getMembershipStatus: failed to load applications', applicationsResponse.message);
        return null;
      }

      const userApps = applicationsResponse.data.filter(
        (app) => app.customerEmail?.toLowerCase() === email.toLowerCase()
      );
      if (userApps.length === 0) {
        return null;
      }

      // Use the most recent application that has bloxMembership set
      const appsWithMembership = userApps
        .filter((app) => app.bloxMembership)
        .sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || '';
          const bTime = b.updatedAt || b.createdAt || '';
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

      const latest = appsWithMembership[0];
      return latest?.bloxMembership || null;
    } catch (error: any) {
      console.log('Failed to get membership status from Supabase:', error);
      return null;
    }
  }
}

export const membershipService = new MembershipService();

