import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';

async function resolveUserRole(
  userId: string,
  email: string | undefined,
  metadataRole: string | undefined
): Promise<User['role']> {
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (data?.role) {
      return data.role as User['role'];
    }

    if (email) {
      const { data: byEmail } = await supabase
        .from('users')
        .select('role')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (byEmail?.role) {
        return byEmail.role as User['role'];
      }
    }
  } catch (error) {
    console.error('Failed to resolve user role from users table:', error);
  }

  // Fail closed: never invent "customer" when DB/metadata role is missing
  if (metadataRole === 'customer' || metadataRole === 'admin' || metadataRole === 'super_admin') {
    return metadataRole as User['role'];
  }
  return 'unknown' as User['role'];
}

/**
 * AuthInitializer component that listens to Supabase auth state changes
 * and updates the Redux store accordingly for the customer app.
 */
export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const buildUser = async (sessionUser: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
    }): Promise<User> => {
      const role = await resolveUserRole(
        sessionUser.id,
        sessionUser.email || undefined,
        sessionUser.user_metadata?.role as string | undefined
      );

      return {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name:
          sessionUser.user_metadata?.first_name && sessionUser.user_metadata?.last_name
            ? `${sessionUser.user_metadata.first_name} ${sessionUser.user_metadata.last_name}`.trim()
            : sessionUser.email || '',
        role,
        permissions: (sessionUser.user_metadata?.permissions as string[]) || [],
      };
    };

    const initializeAuth = async () => {
      try {
        // Timeout so AuthGuard / GuestGuard cannot spin forever on a hung getSession.
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('getSession timeout')), 8000);
          }),
        ]).finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        });

        const session = sessionResult.data?.session ?? null;
        if (mounted && session?.user) {
          const user = await buildUser(session.user);
          dispatch(setCredentials({ user, token: session.access_token }));
          loggingService.setUser(user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        loggingService.captureException(error as Error, { context: 'auth_initialization' });
      } finally {
        if (mounted) {
          dispatch(setInitialized());
        }
      }

      if (mounted) {
        // IMPORTANT: never await supabase.* inside onAuthStateChange — it holds the
        // auth lock and deadlocks refreshSession/getUser/PostgREST (submit hangs forever).
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;

          const accessToken = session?.access_token;
          const sessionUser = session?.user;

          setTimeout(() => {
            void (async () => {
              if (!mounted) return;

              if (sessionUser) {
                const user = await buildUser(sessionUser);
                if (!mounted) return;
                dispatch(setCredentials({ user, token: accessToken || '' }));
                loggingService.setUser(user);
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
