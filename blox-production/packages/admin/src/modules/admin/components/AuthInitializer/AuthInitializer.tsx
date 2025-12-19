import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';

/**
 * Helper function to fetch user role from the users table
 */
const fetchUserRoleFromDB = async (userId: string, email: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // Fallback: try by email if ID lookup fails
      const { data: emailData } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      if (emailData?.role) {
        return emailData.role;
      }
      // Default to customer if not found
      return 'customer';
    }

    return data.role || 'customer';
  } catch (error) {
    console.error('Error fetching user role from DB:', error);
    return 'customer'; // Safe default
  }
};

/**
 * AuthInitializer component that listens to Supabase auth state changes
 * and updates the Redux store accordingly for the admin app.
 */
export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    // Check initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          // Fetch role from users table instead of user_metadata
          const role = await fetchUserRoleFromDB(session.user.id, session.user.email || '');
          
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.first_name 
              ? `${session.user.user_metadata.first_name || ''} ${session.user.user_metadata.last_name || ''}`.trim()
              : session.user.email || '',
            role: role,
            permissions: session.user.user_metadata?.permissions || [],
          };
          dispatch(setCredentials({ user, token: session.access_token }));
          // Set user context in Sentry
          loggingService.setUser(user);
        } else {
          // No session found, mark as initialized anyway
          dispatch(setInitialized());
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        loggingService.captureException(error as Error, { context: 'auth_initialization' });
        // Mark as initialized even on error to prevent infinite loading
        dispatch(setInitialized());
      }

      // Listen to auth state changes
      if (mounted) {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;
          
          if (session?.user) {
            // Fetch role from users table instead of user_metadata
            const role = await fetchUserRoleFromDB(session.user.id, session.user.email || '');
            
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.first_name 
                ? `${session.user.user_metadata.first_name || ''} ${session.user.user_metadata.last_name || ''}`.trim()
                : session.user.email || '',
              role: role,
              permissions: session.user.user_metadata?.permissions || [],
            };
            dispatch(setCredentials({ user, token: session.access_token }));
            // Set user context in Sentry
            loggingService.setUser(user);
          } else {
            dispatch(logout()); // This already sets initialized to true
            // Clear user context in Sentry
            loggingService.setUser(null);
          }
        });
        subscription = authSubscription;
      }
    };

    // Delay initialization slightly to avoid race conditions
    const timeoutId = setTimeout(() => {
      initializeAuth();
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [dispatch]);

  return null;
};

