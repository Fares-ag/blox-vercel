import type { ApiResponse } from '../models/api.model';
import { supabase } from './supabase.service';

export interface SkipCashPaymentRequest {
  amount: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  transactionId: string;
  street?: string; // required for US, UK, and Canada cards only
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  custom1?: string;
  // Optional SkipCash fields
  subject?: string; // Text displayed on payment page
  description?: string; // Text displayed on payment page
  returnUrl?: string; // URL to redirect after payment completion
  webhookUrl?: string; // Override webhook URL (optional, uses dashboard default if not provided)
  onlyDebitCard?: boolean; // Force QPAY/Debit card flow
}

export interface SkipCashPaymentResponse {
  resultObj?: {
    paymentUrl?: string;
    paymentId?: string;
    status?: string;
    [key: string]: any;
  };
  error?: string;
  message?: string;
}

export interface SkipCashVerifyRequest {
  paymentId: string;
  transactionId?: string;
}

class SkipCashService {
  /**
   * Process payment through SkipCash gateway
   * This calls the Supabase Edge Function which securely handles the payment
   */
  async processPayment(
    paymentDetails: SkipCashPaymentRequest
  ): Promise<ApiResponse<SkipCashPaymentResponse>> {
    try {
      const { data, error } = await supabase.functions.invoke('skipcash-payment', {
        body: paymentDetails,
      });

      if (error) {
        return {
          status: 'ERROR',
          message: error.message || 'Failed to process payment',
          data: null as any,
        };
      }

      if (data?.success === false) {
        return {
          status: 'ERROR',
          message: data.error || 'Payment processing failed',
          data: null as any,
        };
      }

      return {
        status: 'SUCCESS',
        data: data?.data as SkipCashPaymentResponse,
        message: 'Payment request generated successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to process payment',
        data: null as any,
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(
    verifyRequest: SkipCashVerifyRequest
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.functions.invoke('skipcash-verify', {
        body: verifyRequest,
      });

      if (error) {
        return {
          status: 'ERROR',
          message: error.message || 'Failed to verify payment',
          data: null,
        };
      }

      if (data?.success === false) {
        return {
          status: 'ERROR',
          message: data.error || 'Payment verification failed',
          data: null,
        };
      }

      return {
        status: 'SUCCESS',
        data: data?.data,
        message: 'Payment verified successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to verify payment',
        data: null,
      };
    }
  }

  /**
   * Handle payment webhook callback
   * This should be called from your webhook endpoint
   */
  async handleWebhook(webhookData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.functions.invoke('skipcash-webhook', {
        body: webhookData,
      });

      if (error) {
        return {
          status: 'ERROR',
          message: error.message || 'Failed to process webhook',
          data: null,
        };
      }

      return {
        status: 'SUCCESS',
        data: data?.data,
        message: 'Webhook processed successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to process webhook',
        data: null,
      };
    }
  }
}

export const skipCashService = new SkipCashService();

