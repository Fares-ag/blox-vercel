import { describe, it, expect, vi, beforeEach } from 'vitest';
import { skipCashService } from '../../services/skipcash.service';
import { supabase } from '../../services/supabase.service';
import type { SkipCashPaymentRequest, SkipCashVerifyRequest } from '../../services/skipcash.service';

vi.mock('../../services/supabase.service', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('SkipCashService', () => {
  const validPaymentRequest: SkipCashPaymentRequest = {
    amount: 1000,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+97412345678',
    email: 'john@example.com',
    transactionId: 'TXN-abc123',
    returnUrl: 'https://app.example.com/callback',
    subject: 'Payment for Application',
    description: 'Installment payment',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should return SUCCESS and paymentUrl when edge function returns payment URL', async () => {
      const paymentUrl = 'https://pay.skipcash.com/checkout/xyz';
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          data: {
            paymentUrl,
            paymentId: 'pay-123',
          },
        },
        error: null,
      } as any);

      const result = await skipCashService.processPayment(validPaymentRequest);

      expect(result.status).toBe('SUCCESS');
      expect(result.data?.paymentUrl).toBe(paymentUrl);
      expect(result.message).toContain('successfully');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('skipcash-payment', {
        body: validPaymentRequest,
      });
    });

    it('should accept payUrl as alternative to paymentUrl', async () => {
      const payUrl = 'https://pay.skipcash.com/checkout/alt';
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { data: { payUrl, paymentId: 'pay-456' } },
        error: null,
      } as any);

      const result = await skipCashService.processPayment(validPaymentRequest);

      expect(result.status).toBe('SUCCESS');
      expect(result.data?.payUrl).toBe(payUrl);
    });

    it('should return ERROR when supabase.functions.invoke returns error', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Network error' } as any,
      } as any);

      const result = await skipCashService.processPayment(validPaymentRequest);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Network error');
      expect(result.data).toBeNull();
    });

    it('should return ERROR when data.success is false', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'Invalid credentials' },
        error: null,
      } as any);

      const result = await skipCashService.processPayment(validPaymentRequest);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Invalid credentials');
    });

    it('should return ERROR when invoke throws (e.g. network or function error)', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('SkipCash API declined'));

      const result = await skipCashService.processPayment(validPaymentRequest);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('SkipCash API declined');
    });

    it('should handle generic exception', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Unexpected failure'));

      const result = await skipCashService.processPayment(validPaymentRequest);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Unexpected failure');
    });
  });

  describe('verifyPayment', () => {
    it('should return SUCCESS when payment status is paid (statusId 2)', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          data: {
            status: 'paid',
            statusId: 2,
            transactionId: 'TXN-abc',
            amount: 1000,
          },
        },
        error: null,
      } as any);

      const result = await skipCashService.verifyPayment({
        transactionId: 'TXN-abc',
        paymentId: 'pay-123',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.data?.status).toBe('paid');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('skipcash-verify', {
        body: { transactionId: 'TXN-abc', paymentId: 'pay-123' },
      });
    });

    it('should return SUCCESS when payment status is completed (string)', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          data: { status: 'completed', transactionId: 'TXN-xyz' },
        },
        error: null,
      } as any);

      const result = await skipCashService.verifyPayment({
        transactionId: 'TXN-xyz',
      } as SkipCashVerifyRequest);

      expect(result.status).toBe('SUCCESS');
      expect(result.data?.status).toBe('completed');
    });

    it('should return ERROR when data.success is false', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: false,
          error: 'Payment not found',
        },
        error: null,
      } as any);

      const result = await skipCashService.verifyPayment({
        paymentId: 'pay-missing',
      } as SkipCashVerifyRequest);

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Payment not found');
    });

    it('should return ERROR when invoke returns error object', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Verification failed' } as any,
      } as any);

      const result = await skipCashService.verifyPayment({
        transactionId: 'TXN-abc',
        paymentId: 'pay-123',
      });

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Verification failed');
    });

    it('should return ERROR on verification timeout', async () => {
      // Simulate timeout by rejecting with the same message the service uses
      vi.mocked(supabase.functions.invoke).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Payment verification timeout (30s). Please try again or check status later.')),
              10
            )
          )
      );

      const result = await skipCashService.verifyPayment({
        transactionId: 'TXN-slow',
        paymentId: 'pay-slow',
      });

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('timeout');
    });

    it('should accept verify request with only transactionId', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, data: { status: 'paid', transactionId: 'TXN-only' } },
        error: null,
      } as any);

      const result = await skipCashService.verifyPayment({
        transactionId: 'TXN-only',
      } as SkipCashVerifyRequest);

      expect(result.status).toBe('SUCCESS');
      expect(supabase.functions.invoke).toHaveBeenCalledWith('skipcash-verify', {
        body: { transactionId: 'TXN-only' },
      });
    });
  });

  describe('handleWebhook', () => {
    it('should return SUCCESS when webhook is processed', async () => {
      const webhookPayload = { event: 'payment.completed', transactionId: 'TXN-123' };
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { data: { received: true } },
        error: null,
      } as any);

      const result = await skipCashService.handleWebhook(webhookPayload);

      expect(result.status).toBe('SUCCESS');
      expect(result.data?.received).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('skipcash-webhook', {
        body: webhookPayload,
      });
    });

    it('should return ERROR when webhook invocation fails', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Webhook processing failed' } as any,
      } as any);

      const result = await skipCashService.handleWebhook({});

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Webhook processing failed');
    });

    it('should handle exception in handleWebhook', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Network error'));

      const result = await skipCashService.handleWebhook({});

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Network error');
    });
  });
});
