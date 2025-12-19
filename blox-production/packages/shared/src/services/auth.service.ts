import type { LoginCredentials, AuthResponse, User } from '../models/user.model';
import { supabase } from './supabase.service';

class AuthService {
  private readonly storageKey = 'blox-supabase-auth';

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

    // Fetch role from users table instead of user_metadata
    let role = 'customer'; // Default
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!userError && userData?.role) {
        role = userData.role;
      } else {
        // Fallback: try by email
        const { data: emailData } = await supabase
          .from('users')
          .select('role')
          .eq('email', data.user.email)
          .single();

        if (emailData?.role) {
          role = emailData.role;
        }
      }
    } catch (err) {
      console.error('Error fetching user role from DB:', err);
      // Keep default 'customer' role
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.first_name && data.user.user_metadata?.last_name
        ? `${data.user.user_metadata.first_name} ${data.user.user_metadata.last_name}`.trim()
        : data.user.email || '',
      role: role,
      permissions: data.user.user_metadata?.permissions || [],
    };

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

    // Fetch role from users table instead of user_metadata
    let role = 'customer'; // Default
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userError && userData?.role) {
        role = userData.role;
      } else {
        // Fallback: try by email
        const { data: emailData } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .single();

        if (emailData?.role) {
          role = emailData.role;
        }
      }
    } catch (err) {
      console.error('Error fetching user role from DB:', err);
      // Keep default 'customer' role
    }

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
