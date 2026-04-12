import { describe, it, expect, vi, beforeEach } from 'vitest';
import { creditsService } from '../../services/credits.service';
import { supabase } from '../../services/supabase.service';

vi.mock('../../services/supabase.service', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('CreditsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('payInstallmentWithCredits', () => {
    it('should return SUCCESS when RPC returns success', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ success: true, message: 'Payment successful', new_balance: 500 }],
        error: null,
      } as any);

      const result = await creditsService.payInstallmentWithCredits(
        'app-123',
        '2025-03-01',
        250
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.data?.success).toBe(true);
      expect(result.data?.newBalance).toBe(500);
      expect(supabase.rpc).toHaveBeenCalledWith('customer_pay_installment_with_credits', {
        p_application_id: 'app-123',
        p_due_date: '2025-03-01',
        p_amount: 250,
      });
    });

    it('should return ERROR when amount is <= 0', async () => {
      const result = await creditsService.payInstallmentWithCredits('app-123', '2025-03-01', 0);

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('greater than 0');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should return ERROR when RPC returns success: false (e.g. insufficient balance)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ success: false, message: 'Insufficient Blox Credits balance', new_balance: 100 }],
        error: null,
      } as any);

      const result = await creditsService.payInstallmentWithCredits(
        'app-123',
        '2025-03-01',
        250
      );

      expect(result.status).toBe('ERROR');
      expect(result.data?.success).toBe(false);
      expect(result.message).toContain('Insufficient');
    });

    it('should return ERROR when RPC returns error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' } as any,
      } as any);

      const result = await creditsService.payInstallmentWithCredits(
        'app-123',
        '2025-03-01',
        250
      );

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Permission denied');
    });

    it('should return ERROR when RPC returns empty data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      const result = await creditsService.payInstallmentWithCredits(
        'app-123',
        '2025-03-01',
        250
      );

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('No result');
    });
  });
});
