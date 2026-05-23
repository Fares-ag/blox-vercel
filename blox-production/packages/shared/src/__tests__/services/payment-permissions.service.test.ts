import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentPermissionsService } from '../../services/payment-permissions.service';
import { supabase } from '../../services/supabase.service';

vi.mock('../../services/supabase.service', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('PaymentPermissionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCanPayForApplication', () => {
    it('should return true when RPC returns true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as any);

      const result = await paymentPermissionsService.getCanPayForApplication('app-123');

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('current_user_can_pay_for_application', {
        p_application_id: 'app-123',
      });
    });

    it('should return false when RPC returns false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null,
      } as any);

      const result = await paymentPermissionsService.getCanPayForApplication('app-456');

      expect(result).toBe(false);
    });

    it('should return false when applicationId is empty', async () => {
      const result = await paymentPermissionsService.getCanPayForApplication('');

      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should return false when RPC returns error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RLS policy violation' } as any,
      } as any);

      const result = await paymentPermissionsService.getCanPayForApplication('app-789');

      expect(result).toBe(false);
    });

    it('should return false on unexpected exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));

      const result = await paymentPermissionsService.getCanPayForApplication('app-err');

      expect(result).toBe(false);
    });

    it('should treat truthy non-boolean data as true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 1,
        error: null,
      } as any);

      const result = await paymentPermissionsService.getCanPayForApplication('app-1');

      expect(result).toBe(true);
    });
  });
});
