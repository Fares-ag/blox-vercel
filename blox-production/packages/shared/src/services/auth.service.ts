import type { LoginCredentials, AuthResponse, User } from '../models/user.model';
import { supabase } from './supabase.service';
import { devLogger } from '../utils/logger.util';

class AuthService {
  private readonly storageKey = 'blox-supabase-auth';

  /**
   * Resolve role from public.users only.
   * Never grant elevated roles from JWT user_metadata (client-settable).
   */
  private async fetchUserRoleFromDB(userId: string, email: string): Promise<string> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        const allowedRoles = new Set([
          'admin',
          'super_admin',
          'customer',
          'dealer_agent',
          'credit_officer',
        ]);

        if (!error && data?.role) {
          const role = String(data.role).trim().toLowerCase();
          if (allowedRoles.has(role)) return role;
        }

        if (email) {
          const { data: emailData, error: emailError } = await supabase
            .from('users')
            .select('role')
            .eq('email', email)
            .maybeSingle();

          if (!emailError && emailData?.role) {
            const role = String(emailData.role).trim().toLowerCase();
            if (allowedRoles.has(role)) return role;
          }
        }

        return 'unknown';
      } catch (error: unknown) {
        devLogger.debug('Failed to resolve role from DB', error);
        return 'unknown';
      }
    })();

    const timeoutPromise = new Promise<string>((resolve) => {
      timeoutId = setTimeout(() => resolve('timeout'), 2000);
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Fail closed on timeout — never elevate from metadata.
    if (result === 'timeout') {
      devLogger.debug('Users table query timed out; failing closed with unknown role');
      return 'unknown';
    }

    return result as string;
  }

  private readStoredSessionSync(): any | null {
    // Supabase stores the session in localStorage under the configured storageKey
    // (see `packages/shared/src/services/supabase.service.ts`).
    const raw =
      localStorage.getItem(this.storageKey) ||
      sessionStorage.getItem(this.storageKey) ||
      // Backward-compat fallbacks (older code paths)
      sessionStorage.getItem('sb-blox-supabase-auth-token') ||
      localStorage.getItem('sb-blox-supabase-auth-token');

    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Some libraries wrap the session under currentSession
      return parsed?.currentSession || parsed;
    } catch {
      return null;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message || 'Login failed');
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed: No user or session returned');
    }

    const role = await this.fetchUserRoleFromDB(
      data.user.id,
      data.user.email || ''
    );

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.first_name && data.user.user_metadata?.last_name
        ? `${data.user.user_metadata.first_name} ${data.user.user_metadata.last_name}`.trim()
        : data.user.email || '',
      role: role,
      permissions: data.user.user_metadata?.permissions || [],
    };

    // Log login activity
    try {
      const { activityTrackingService } = await import('./activity-tracking.service');
      await activityTrackingService.logActivity('login', 'user', {
        resourceId: user.id,
        resourceName: user.email,
        description: `User logged in: ${user.email}`,
        metadata: {
          role: user.role,
        },
        user: user,
      });
    } catch (error) {
      console.error('Failed to log login activity:', error);
    }

    return {
      user,
      token: data.session.access_token,
    };
  }

  async logout(): Promise<void> {
    // Get current user before logout for activity logging
    const currentUser = await this.getUser();
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }

    // Log logout activity
    if (currentUser) {
      try {
        const { activityTrackingService } = await import('./activity-tracking.service');
        await activityTrackingService.logActivity('logout', 'user', {
          resourceId: currentUser.id,
          resourceName: currentUser.email,
          description: `User logged out (${currentUser.role})`,
          metadata: {
            role: currentUser.role,
            email: currentUser.email,
          },
          user: currentUser,
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    }
  }

  /**
   * Resolve password-reset landing path from the portal that initiated the request.
   * Hardcoding /admin broke dealer/credit/customer reset links on separate origins.
   */
  private resolvePasswordResetRedirectTo(): string {
    const origin = window.location.origin;
    const path = window.location.pathname || '';
    if (path.startsWith('/dealer')) return `${origin}/dealer/auth/reset-password`;
    if (path.startsWith('/credit')) return `${origin}/credit/auth/reset-password`;
    if (path.startsWith('/customer')) return `${origin}/customer/auth/reset-password`;
    if (path.startsWith('/super-admin')) return `${origin}/super-admin/auth/reset-password`;
    return `${origin}/admin/auth/reset-password`;
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: this.resolvePasswordResetRedirectTo(),
    });

    if (error) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  async resetPassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  async getToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async getUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const role = await this.fetchUserRoleFromDB(user.id, user.email || '');

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.first_name && user.user_metadata?.last_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim()
        : user.email || '',
      role: role,
      permissions: user.user_metadata?.permissions || [],
    };
  }

  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  // Synchronous methods for initial state (may return null if session not loaded yet)
  getTokenSync(): string | null {
    const session = this.readStoredSessionSync();
        return session?.access_token || null;
  }

  getUserSync(): User | null {
    const session = this.readStoredSessionSync();
    const user = session?.user;
    if (!user) return null;

    // Sync path cannot query DB — use unknown until AuthInitializer resolves from DB.
    // Never elevate from client-settable user_metadata.
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.first_name && user.user_metadata?.last_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim()
            : user.email || '',
      role: 'unknown',
          permissions: user.user_metadata?.permissions || [],
        };
  }

  isAuthenticatedSync(): boolean {
    return !!this.getTokenSync();
  }
}

export const authService = new AuthService();
