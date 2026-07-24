import { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';
import { devLogger } from '@shared/utils/logger.util';
import { isFullAdminRole } from '@shared/utils/rbac';

interface UserMetadata {
  role?: string;
  user_role?: string;
  userRole?: string;
  [key: string]: unknown;
}

/**
 * Resolve role from public.users / is_admin() only.
 * Never grant elevated roles from JWT user_metadata (client-settable).
 */
const fetchUserRoleFromDB = async (userId: string, email: string): Promise<string> => {
  try {
    const { data: adminFlag, error: adminErr } = await supabase.rpc('is_admin');
    if (!adminErr && adminFlag === true) {
      const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
      const role = (data?.role || '').trim().toLowerCase();
      if (role === 'super_admin' || role === 'admin') return role;
      return 'admin';
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.role) {
      const role = String(data.role).trim().toLowerCase();
      if (isFullAdminRole(role) || role === 'customer') return role;
    }

    if (email) {
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .maybeSingle();
      if (!emailError && emailData?.role) {
        const role = String(emailData.role).trim().toLowerCase();
        if (isFullAdminRole(role) || role === 'customer') return role;
      }
    }

    return 'unknown';
  } catch (error) {
    devLogger.debug('Failed to resolve admin role from DB', error);
    return 'unknown';
  }
};

/**
 * AuthInitializer — Admin portal. Privilege only from public.users / is_admin().
 * Allows admin / super_admin only (dealer and credit have their own apps).
 */
export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const applySession = async (session: {
      access_token: string;
      user: { id: string; email?: string | null; user_metadata?: UserMetadata };
    }) => {
      const dbRole = await fetchUserRoleFromDB(session.user.id, session.user.email || '');
      if (!mounted) return;

      if (isFullAdminRole(dbRole)) {
        const meta = session.user.user_metadata || {};
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: meta.name || meta.first_name
            ? `${meta.first_name || ''} ${meta.last_name || ''}`.trim()
            : session.user.email || '',
          role: dbRole,
          permissions: (meta.permissions as string[]) || [],
        };
        dispatch(setCredentials({ user, token: session.access_token }));
        loggingService.setUser(user);
      } else {
        dispatch(logout());
        void supabase.auth.signOut();
      }
    };

    const initializeAuth = async () => {
      try {
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
          await applySession(session);
        }
        if (mounted) dispatch(setInitialized());
      } catch (error) {
        console.error('Error initializing auth:', error);
        loggingService.captureException(error as Error, { context: 'auth_initialization' });
        if (mounted) {
          dispatch(logout());
          dispatch(setInitialized());
        }
      }

      if (mounted) {
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          const accessToken = session?.access_token;
          const sessionUser = session?.user;

          setTimeout(() => {
            void (async () => {
              if (!mounted) return;
              if (sessionUser && accessToken) {
                await applySession({
                  access_token: accessToken,
                  user: sessionUser,
                });
              } else {
                dispatch(logout());
              }
            })();
          }, 0);
        });
        subscription = authSubscription;
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return null;
};
