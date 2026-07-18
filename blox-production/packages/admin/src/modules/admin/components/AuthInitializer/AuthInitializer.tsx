import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';
import { devLogger } from '@shared/utils/logger.util';

/**
 * Helper function to fetch user role from the users table
 * Falls back to user_metadata if table is not accessible
 * Optimized with timeout to prevent long loading times
 */
interface UserMetadata {
  role?: string;
  user_role?: string;
  userRole?: string;
  [key: string]: unknown;
}

const fetchUserRoleFromDB = async (userId: string, email: string, userMetadata?: UserMetadata): Promise<string> => {
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
      // Check for 406 in status, code, or message
      const is406Error = (error as any)?.status === 406 || 
                        error?.code === 'PGRST116' || 
                        error?.message?.includes('406') ||
                        error?.message?.includes('Not Acceptable');

      if (is406Error) {
        // Silently use metadata - this is expected if RLS blocks access
        devLogger.debug('Users table not accessible (406), using user_metadata (this is expected if RLS policies are not set up)');
        return roleFromMetadata || 'unknown';
      }

      if (!error && data?.role) {
        return data.role;
      }

      // Only try email fallback if ID lookup didn't return 406
      if (error && !is406Error) {
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (!emailError && emailData?.role) {
          return emailData.role;
        }

        // If email lookup also returns 406, use metadata
        const isEmail406Error = (emailError as any)?.status === 406 || 
                               emailError?.code === 'PGRST116' || 
                               emailError?.message?.includes('406') ||
                               emailError?.message?.includes('Not Acceptable');

        if (isEmail406Error) {
          devLogger.debug('Users table not accessible (406), using user_metadata');
          return roleFromMetadata || 'unknown';
        }
      }

      // Fail closed — never invent "customer" in the admin portal
      return roleFromMetadata || 'unknown';
    } catch (error: any) {
      // If it's a 406 or table access error, use metadata immediately
      const is406Error = (error as any)?.status === 406 || 
                        error?.code === 'PGRST116' || 
                        error?.message?.includes('406') ||
                        error?.message?.includes('Not Acceptable');

      if (is406Error) {
        devLogger.debug('Users table not accessible (406), using user_metadata');
        return roleFromMetadata || 'unknown';
      }
      return roleFromMetadata || 'unknown';
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
    devLogger.debug('Users table query timed out, using user_metadata (this is expected if users table is not accessible)');
    return roleFromMetadata || 'unknown';
  }

  return result as string;
};

function resolveMetadataRole(userMetadata?: UserMetadata): string {
  const raw =
    userMetadata?.role || userMetadata?.user_role || userMetadata?.userRole;
  if (raw === 'admin' || raw === 'super_admin' || raw === 'customer') {
    return raw;
  }
  return 'unknown';
}

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
          const metadataRole = resolveMetadataRole(session.user.user_metadata);

          const buildUser = (role: string): User => ({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.first_name
              ? `${session.user.user_metadata.first_name || ''} ${session.user.user_metadata.last_name || ''}`.trim()
              : session.user.email || '',
            role,
            permissions: session.user.user_metadata?.permissions || [],
          });

          // CRITICAL: Only set credentials if user is admin / super_admin
          if (metadataRole === 'admin' || metadataRole === 'super_admin') {
            const user = buildUser(metadataRole);
            dispatch(setCredentials({ user, token: session.access_token }));
            dispatch(setInitialized());
            loggingService.setUser(user);

            fetchUserRoleFromDB(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata
            ).then((dbRole) => {
              if (mounted && (dbRole === 'admin' || dbRole === 'super_admin') && dbRole !== metadataRole) {
                dispatch(setCredentials({
                  user: { ...user, role: dbRole },
                  token: session.access_token,
                }));
              } else if (
                mounted &&
                dbRole !== 'admin' &&
                dbRole !== 'super_admin'
              ) {
                dispatch(logout());
                void supabase.auth.signOut();
              }
            }).catch((err) => {
              devLogger.debug('Background role fetch failed:', err);
            });
          } else if (metadataRole === 'customer') {
            dispatch(logout());
            void supabase.auth.signOut();
            dispatch(setInitialized());
          } else {
            // Metadata missing/unknown — await DB before denying (admins with empty JWT metadata)
            const dbRole = await fetchUserRoleFromDB(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata
            );
            if (!mounted) return;
            if (dbRole === 'admin' || dbRole === 'super_admin') {
              const user = buildUser(dbRole);
              dispatch(setCredentials({ user, token: session.access_token }));
              loggingService.setUser(user);
            } else {
              dispatch(logout());
              void supabase.auth.signOut();
            }
            dispatch(setInitialized());
          }
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
        // Defer supabase.* calls — awaiting them inside onAuthStateChange deadlocks the auth lock.
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;

          const accessToken = session?.access_token;
          const sessionUser = session?.user;

          setTimeout(() => {
            void (async () => {
              if (!mounted) return;

              if (sessionUser) {
                const metadataRole = resolveMetadataRole(sessionUser.user_metadata);

                const buildUser = (role: string): User => ({
                  id: sessionUser.id,
                  email: sessionUser.email || '',
                  name: sessionUser.user_metadata?.name || sessionUser.user_metadata?.first_name
                    ? `${sessionUser.user_metadata.first_name || ''} ${sessionUser.user_metadata.last_name || ''}`.trim()
                    : sessionUser.email || '',
                  role,
                  permissions: sessionUser.user_metadata?.permissions || [],
                });

                if (metadataRole === 'admin' || metadataRole === 'super_admin') {
                  const user = buildUser(metadataRole);
                  dispatch(setCredentials({ user, token: accessToken || '' }));
                  loggingService.setUser(user);

                  fetchUserRoleFromDB(
                    sessionUser.id,
                    sessionUser.email || '',
                    sessionUser.user_metadata
                  ).then((dbRole) => {
                    if (mounted && (dbRole === 'admin' || dbRole === 'super_admin') && dbRole !== metadataRole) {
                      dispatch(setCredentials({
                        user: { ...user, role: dbRole },
                        token: accessToken || '',
                      }));
                    } else if (
                      mounted &&
                      dbRole !== 'admin' &&
                      dbRole !== 'super_admin'
                    ) {
                      dispatch(logout());
                      void supabase.auth.signOut();
                    }
                  }).catch(() => {
                    // Silently fail - we already have metadata role
                  });
                } else if (metadataRole === 'customer') {
                  dispatch(logout());
                  void supabase.auth.signOut();
                } else {
                  const dbRole = await fetchUserRoleFromDB(
                    sessionUser.id,
                    sessionUser.email || '',
                    sessionUser.user_metadata
                  );
                  if (!mounted) return;
                  if (dbRole === 'admin' || dbRole === 'super_admin') {
                    const user = buildUser(dbRole);
                    dispatch(setCredentials({ user, token: accessToken || '' }));
                    loggingService.setUser(user);
                  } else {
                    dispatch(logout());
                    void supabase.auth.signOut();
                  }
                }
              } else {
                dispatch(logout());
                loggingService.setUser(null);
              }
            })();
          }, 0);
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

