import { supabase } from '@shared/services/supabase.service';
import type { LoginCredentials, AuthResponse, User } from '@shared/models/user.model';

export interface SignUpData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  qid: string;
  gender: 'Male' | 'Female';
  password: string;
  confirm_password: string;
  nationality: string;
}

class CustomerAuthService {
  private readonly storageKey = 'blox-supabase-auth';

  private readStoredSessionSync(): any | null {
    const raw =
      localStorage.getItem(this.storageKey) ||
      sessionStorage.getItem(this.storageKey) ||
      // Backward-compat fallbacks (older code paths)
      sessionStorage.getItem('sb-blox-supabase-auth-token') ||
      localStorage.getItem('sb-blox-supabase-auth-token');

    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.currentSession || parsed;
    } catch {
      return null;
    }
  }
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    let emailToUse = credentials.email;

    // Check if the input is a phone number (doesn't contain @ and matches phone pattern)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(credentials.email);

    if (!isEmail) {
      // It's likely a phone number, try to find the user's email via RPC function
      try {
        // Normalize phone number (remove spaces, dashes, parentheses, etc.)
        const normalizedPhone = credentials.email.replace(/[\s\-\(\)]/g, '');
        
        // Try to find user by phone number using RPC function
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_email_by_phone', {
          phone_number: normalizedPhone
        });

        if (!rpcError && rpcData) {
          emailToUse = rpcData;
        } else {
          // If RPC function doesn't exist or returns error, try with different phone formats
          const phoneVariations = [
            normalizedPhone,
            credentials.email.replace(/\s/g, ''),
            credentials.email.replace(/[\s\-\(\)]/g, ''),
            `+${normalizedPhone.replace(/^\+/, '')}`,
            normalizedPhone.replace(/^\+/, ''),
          ];

          for (const phoneVar of phoneVariations) {
            const { data: lookupData, error: lookupError } = await supabase.rpc('get_email_by_phone', {
              phone_number: phoneVar
            });
            
            if (!lookupError && lookupData) {
              emailToUse = lookupData;
              break;
            }
          }

          // If still no email found and RPC function doesn't exist, throw helpful error
          if (emailToUse === credentials.email && rpcError?.message?.includes('function') && rpcError?.message?.includes('does not exist')) {
            throw new Error('Phone number login is not configured. Please contact support or use your email address to login.');
          }
        }
      } catch (lookupError: any) {
        // If lookup fails with a specific error about function not existing, provide helpful message
        if (lookupError?.message?.includes('function') && lookupError?.message?.includes('does not exist')) {
          throw new Error('Phone number login requires database setup. Please use your email address to login, or contact support.');
        }
        // Otherwise, continue and try to login with the input as-is
        // (might work if phone was stored as email in some edge cases)
      }
    }

    // Attempt login with email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: credentials.password,
    });

    if (error) {
      // Provide more helpful error message for phone number attempts
      if (!isEmail) {
        throw new Error('Login failed. Please check your phone number and password, or try using your email address instead.');
      }
      throw new Error(error.message || 'Login failed');
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed: No user or session returned');
    }

    // Map Supabase user to your User model
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.first_name && data.user.user_metadata?.last_name
        ? `${data.user.user_metadata.first_name} ${data.user.user_metadata.last_name}`.trim()
        : data.user.email || '',
      role: data.user.user_metadata?.role || 'customer',
      permissions: data.user.user_metadata?.permissions || [],
    };

    // Log login activity
    try {
      const { activityTrackingService } = await import('@shared/services/activity-tracking.service');
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

  async signup(data: SignUpData): Promise<void> {
    if (data.password !== data.confirm_password) {
      throw new Error('Passwords do not match');
    }

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          qid: data.qid,
          gender: data.gender,
          nationality: data.nationality,
          role: 'customer',
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    // Get current user and session BEFORE logout for activity logging
    let currentUser: User | null = null;
    try {
      currentUser = await this.getUser();
      // Verify session is still active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !currentUser) {
        // No session or user, skip logging
        currentUser = null;
      }
    } catch (error) {
      console.error('Error getting user before logout:', error);
    }
    
    // Log logout activity BEFORE signing out (while session is still active)
    if (currentUser) {
      try {
        const { activityTrackingService } = await import('@shared/services/activity-tracking.service');
        // Log while session is still active
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
        // Continue with logout even if logging fails
      }
    }
    
    // Now sign out (after logging)
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/customer/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  async validateResetToken(): Promise<boolean> {
    // Supabase handles token validation automatically via the reset link
    // Check if there's an active session
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  async resetPassword(password: string, confirmPassword: string): Promise<void> {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

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

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.first_name && user.user_metadata?.last_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim()
        : user.email || '',
      role: user.user_metadata?.role || 'customer',
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

  async isEmailVerified(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
  }

  async checkEmailVerificationStatus(): Promise<{ verified: boolean; email?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { verified: false };
    }
    return {
      verified: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
      email: user.email,
    };
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null, session: any) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.first_name && session.user.user_metadata?.last_name
            ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`.trim()
            : session.user.email || '',
          role: session.user.user_metadata?.role || 'customer',
          permissions: session.user.user_metadata?.permissions || [],
        };
        callback(user, session);
      } else {
        callback(null, null);
      }
    });
  }
}

export const customerAuthService = new CustomerAuthService();

