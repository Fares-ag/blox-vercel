import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';

/**
 * Helper function to fetch user role from the users table
 * Falls back to user_metadata if table is not accessible
 * Optimized with timeout to prevent long loading times
 */
const fetchUserRoleFromDB = async (userId: string, email: string, userMetadata?: any): Promise<string> => {
  // First, check user_metadata immediately (fast path)
  const roleFromMetadata = userMetadata?.role || userMetadata?.user_role || userMetadata?.userRole;
  
  // Create a timeout promise (2 seconds max) with cleanup support
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<string>((resolve) => {
    timeoutId = setTimeout(() => resolve('timeout'), 2000);
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
      if (error?.code === 'PGRST116' || error?.message?.includes('406')) {
        // Only log in development mode
        if (import.meta.env.DEV) {
          console.debug('Users table not accessible (406), using user_metadata (this is expected if RLS policies are not set up)');
        }
        return roleFromMetadata || 'customer';
      }

      if (!error && data?.role) {
        return data.role;
      }

      // Only try email fallback if ID lookup didn't return 406
      if (error && error.code !== 'PGRST116' && !error.message?.includes('406')) {
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (!emailError && emailData?.role) {
          return emailData.role;
        }

        // If email lookup also returns 406, use metadata
        if (emailError?.code === 'PGRST116' || emailError?.message?.includes('406')) {
          // Only log in development mode
          if (import.meta.env.DEV) {
            console.debug('Users table not accessible (406), using user_metadata');
          }
          return roleFromMetadata || 'customer';
        }
      }

      // Default to metadata if available, otherwise customer
      return roleFromMetadata || 'customer';
    } catch (error: any) {
      // If it's a 406 or table access error, use metadata immediately
      if (error?.code === 'PGRST116' || error?.message?.includes('406')) {
        // Only log in development mode
        if (import.meta.env.DEV) {
          console.debug('Users table not accessible (406), using user_metadata');
        }
        return roleFromMetadata || 'customer';
      }
      return roleFromMetadata || 'customer';
    }
  })();

  // Race between fetch and timeout
  const result = await Promise.race([fetchPromise, timeoutPromise]);
  
  // Clean up timeout if it's still pending (if fetchPromise won the race)
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  
  // If timeout, use metadata immediately
  if (result === 'timeout') {
    // Only log in development mode to reduce console noise in production
    if (import.meta.env.DEV) {
      console.debug('Users table query timed out, using user_metadata (this is expected if users table is not accessible)');
    }
    return roleFromMetadata || 'customer';
  }

  return result as string;
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
          // Use metadata immediately for faster initialization, then update from DB if available
          const metadataRole = session.user.user_metadata?.role || 
                              session.user.user_metadata?.user_role || 
                              session.user.user_metadata?.userRole || 
                              'customer';
          
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.first_name 
              ? `${session.user.user_metadata.first_name || ''} ${session.user.user_metadata.last_name || ''}`.trim()
              : session.user.email || '',
            role: metadataRole, // Use metadata first for instant initialization
            permissions: session.user.user_metadata?.permissions || [],
          };
          
          // Set credentials immediately so app can load
          dispatch(setCredentials({ user, token: session.access_token }));
          // Mark as initialized immediately (setInitialized is called separately to avoid double render)
          dispatch(setInitialized());
          
          // Set user context in Sentry
          loggingService.setUser(user);
          
          // Then try to fetch from DB in background (non-blocking)
          fetchUserRoleFromDB(
            session.user.id, 
            session.user.email || '', 
            session.user.user_metadata
          ).then((dbRole) => {
            // Only update if role changed and we're still mounted
            if (mounted && dbRole !== metadataRole) {
              dispatch(setCredentials({ 
                user: { ...user, role: dbRole }, 
                token: session.access_token 
              }));
            }
          }).catch((err) => {
            // Silently fail - we already have metadata role
            console.debug('Background role fetch failed:', err);
          });
        } else {
          // No session found, mark as initialized immediately
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
            // Use metadata immediately for faster updates
            const metadataRole = session.user.user_metadata?.role || 
                                session.user.user_metadata?.user_role || 
                                session.user.user_metadata?.userRole || 
                                'customer';
            
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.user_metadata?.first_name 
                ? `${session.user.user_metadata.first_name || ''} ${session.user.user_metadata.last_name || ''}`.trim()
                : session.user.email || '',
              role: metadataRole, // Use metadata first
              permissions: session.user.user_metadata?.permissions || [],
            };
            
            dispatch(setCredentials({ user, token: session.access_token }));
            // Set user context in Sentry
            loggingService.setUser(user);
            
            // Try to fetch from DB in background (non-blocking)
            fetchUserRoleFromDB(
              session.user.id, 
              session.user.email || '', 
              session.user.user_metadata
            ).then((dbRole) => {
              if (mounted && dbRole !== metadataRole) {
                dispatch(setCredentials({ 
                  user: { ...user, role: dbRole }, 
                  token: session.access_token 
                }));
              }
            }).catch(() => {
              // Silently fail - we already have metadata role
            });
          } else {
            dispatch(logout()); // This already sets initialized to true
            // Clear user context in Sentry
            loggingService.setUser(null);
          }
        });
        subscription = authSubscription;
      }
    };

    // Initialize immediately (no delay needed)
    initializeAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [dispatch]);

  return null;
};

