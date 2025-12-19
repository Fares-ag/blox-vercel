import type { LoginCredentials, AuthResponse, User } from '../models/user.model';
import { supabase } from './supabase.service';

class AuthService {
  private readonly storageKey = 'blox-supabase-auth';

  private async fetchUserRoleFromDB(userId: string, email: string, userMetadata?: any): Promise<string> {
    // First, check user_metadata immediately (fast path)
    const roleFromMetadata = userMetadata?.role || userMetadata?.user_role || userMetadata?.userRole;
    
    // Create a timeout promise (2 seconds max)
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('timeout'), 2000);
    });

    // Try to fetch from users table with timeout
    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        // If we get a 406 error immediately, skip the email fallback
        if (error?.code === 'PGRST116' || error?.message?.includes('406') || error?.status === 406) {
          return roleFromMetadata || 'customer';
        }

        if (!error && data?.role) {
          return data.role;
        }

        // Only try email fallback if ID lookup didn't return 406
        if (error && error.status !== 406) {
          const { data: emailData, error: emailError } = await supabase
            .from('users')
            .select('role')
            .eq('email', email)
            .single();

          if (!emailError && emailData?.role) {
            return emailData.role;
          }

          // If email lookup also returns 406, use metadata
          if (emailError?.code === 'PGRST116' || emailError?.message?.includes('406') || emailError?.status === 406) {
            return roleFromMetadata || 'customer';
          }
        }

        // Default to metadata if available, otherwise customer
        return roleFromMetadata || 'customer';
      } catch (error: any) {
        // If it's a 406 or table access error, use metadata immediately
        if (error?.code === 'PGRST116' || error?.message?.includes('406') || error?.status === 406) {
          return roleFromMetadata || 'customer';
        }
        return roleFromMetadata || 'customer';
      }
    })();

    // Race between fetch and timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    // If timeout, use metadata immediately
    if (result === 'timeout') {
      return roleFromMetadata || 'customer';
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

    // Use metadata first for faster response, then try DB in background
    const metadataRole = data.user.user_metadata?.role || 
                        data.user.user_metadata?.user_role || 
                        data.user.user_metadata?.userRole || 
                        'customer';

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.first_name && data.user.user_metadata?.last_name
        ? `${data.user.user_metadata.first_name} ${data.user.user_metadata.last_name}`.trim()
        : data.user.email || '',
      role: metadataRole, // Use metadata first for instant response
      permissions: data.user.user_metadata?.permissions || [],
    };

    // Try to fetch from DB in background (non-blocking)
    this.fetchUserRoleFromDB(
      data.user.id, 
      data.user.email || '', 
      data.user.user_metadata
    ).then((dbRole) => {
      if (dbRole !== metadataRole) {
        // Role updated from DB - but we already returned, so this is just for future calls
        console.debug('Role updated from DB:', dbRole);
      }
    }).catch(() => {
      // Silently fail - we already have metadata role
    });

    return {
      user,
      token: data.session.access_token,
    };
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/auth/reset-password`,
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

    // Fetch role from users table, fallback to user_metadata if table not accessible
    const role = await this.fetchUserRoleFromDB(user.id, user.email || '', user.user_metadata);

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

    // For sync method, we can't fetch from DB, so use user_metadata as fallback
    // The async AuthInitializer will update the role from DB after mount
    const roleRaw =
      user.user_metadata?.role ??
      user.user_metadata?.user_role ??
      user.user_metadata?.userRole;

        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.first_name && user.user_metadata?.last_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim()
            : user.email || '',
      role: roleRaw || 'customer',
          permissions: user.user_metadata?.permissions || [],
        };
  }

  isAuthenticatedSync(): boolean {
    return !!this.getTokenSync();
  }
}

export const authService = new AuthService();
