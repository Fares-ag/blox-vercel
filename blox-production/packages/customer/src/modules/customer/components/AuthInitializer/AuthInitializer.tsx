import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';

/**
 * AuthInitializer component that listens to Supabase auth state changes
 * and updates the Redux store accordingly for the customer app.
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
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.first_name && session.user.user_metadata?.last_name
              ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`.trim()
              : session.user.email || '',
            role: session.user.user_metadata?.role || 'customer',
            permissions: session.user.user_metadata?.permissions || [],
          };
          dispatch(setCredentials({ user, token: session.access_token }));
          // Set user context in Sentry
          loggingService.setUser(user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        loggingService.captureException(error as Error, { context: 'auth_initialization' });
      }

      // Listen to auth state changes
      if (mounted) {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
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
            dispatch(setCredentials({ user, token: session.access_token }));
            // Set user context in Sentry
            loggingService.setUser(user);
          } else {
            dispatch(logout());
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

