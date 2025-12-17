import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../services/auth.service';
import { supabase } from '../../services/supabase.service';
import type { User } from '../../models/user.model';

// Mock Supabase
vi.mock('../../services/supabase.service', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          role: 'admin',
          first_name: 'Test',
          last_name: 'User',
        },
      };

      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: mockUser as any,
          session: mockSession as any,
        },
        error: null,
      } as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe('admin');
      expect(result.token).toBe('mock-token');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error on invalid credentials', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' } as any,
      } as any);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when no user or session returned', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as any);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Login failed: No user or session returned');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      } as any);

      await authService.logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error on logout failure', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Logout failed' } as any,
      } as any);

      await expect(authService.logout()).rejects.toBeDefined();
    });
  });

  describe('forgotPassword', () => {
    it('should successfully send reset password email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        error: null,
      } as any);

      await authService.forgotPassword('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/admin/auth/reset-password'),
        })
      );
    });

    it('should throw error on failure', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        error: { message: 'Email not found' } as any,
      } as any);

      await expect(authService.forgotPassword('test@example.com')).rejects.toThrow(
        'Email not found'
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      await authService.resetPassword('newPassword123');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });
    });

    it('should throw error on failure', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak' } as any,
      } as any);

      await expect(authService.resetPassword('weak')).rejects.toThrow('Password too weak');
    });
  });

  describe('getToken', () => {
    it('should return token when session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
          } as any,
        },
        error: null,
      } as any);

      const token = await authService.getToken();

      expect(token).toBe('mock-token');
    });

    it('should return null when no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      const token = await authService.getToken();

      expect(token).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
          } as any,
        },
        error: null,
      } as any);

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false when no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });
});

