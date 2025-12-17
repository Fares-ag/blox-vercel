import { apiService } from '@shared/services/api.service';
import type { PaymentDeferral, BloxMembership } from '@shared/models/application.model';
import { MembershipConfig } from '@shared/config/app.config';
import { deferralService } from './deferral.service';
import moment from 'moment';

class MembershipService {
  async purchaseMembership(
    applicationId: string,
    membershipType: 'monthly' | 'yearly'
  ): Promise<BloxMembership> {
    try {
      const response = await apiService.post<BloxMembership>(`/customer/membership/purchase`, {
        applicationId,
        membershipType,
      });
      
      if (response.status === 'SUCCESS' && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to purchase membership');
    } catch (error: any) {
      // Fallback for offline mode - create mock membership
      if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
        console.log('API not available, using mock membership');
        
        const mockMembership: BloxMembership = {
          isActive: true,
          membershipType: membershipType,
          purchasedDate: new Date().toISOString(),
          cost: membershipType === 'yearly' ? MembershipConfig.costPerYear : MembershipConfig.costPerMonth,
          ...(membershipType === 'monthly' && {
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          ...(membershipType === 'yearly' && {
            renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        };
        
        return mockMembership;
      }
      
      throw error;
    }
  }

  async getDeferralStatus(): Promise<{
    remainingDeferrals: number;
    deferralsUsed: number;
    year: number;
  }> {
    try {
      const response = await apiService.get('/customer/membership/deferral-status');
      
      if (response.status === 'SUCCESS' && response.data) {
        return response.data;
      }
      
      // Fallback: use deferral service
      return deferralService.getDeferralStatus();
    } catch (error: any) {
      // Fallback: use deferral service
      console.log('API not available, using deferral service');
      return deferralService.getDeferralStatus();
    }
  }

  async deferPayment(
    applicationId: string,
    paymentDueDate: string,
    reason?: string,
    deferredAmount?: number
  ): Promise<PaymentDeferral> {
    try {
      const response = await apiService.post<PaymentDeferral>('/customer/membership/defer-payment', {
        applicationId,
        paymentDueDate,
        reason,
      });
      
      if (response.status === 'SUCCESS' && response.data) {
        // Also save to local storage
        deferralService.addDeferral(response.data);
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to defer payment');
    } catch (error: any) {
      // Fallback for offline mode
      if (error.message?.includes('Network error') || error.message?.includes('Failed to fetch')) {
        console.log('API not available, using local deferral service');
        
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
        
        // Save to local storage
        deferralService.addDeferral(deferral);
        
        return deferral;
      }
      
      throw error;
    }
  }

  async getMembershipStatus(): Promise<BloxMembership | null> {
    try {
      const response = await apiService.get<BloxMembership>('/customer/membership/status');
      
      if (response.status === 'SUCCESS' && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.log('Failed to get membership status:', error);
      return null;
    }
  }
}

export const membershipService = new MembershipService();

