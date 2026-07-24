import { useEffect } from 'react';
import { useAppDispatch } from '@admin-module/store/hooks';
import { setCredentials, logout, setInitialized } from '@admin-module/store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';
import { isFinancePortalRole } from '@shared/utils/rbac';

const fetchUserRoleFromDB = async (userId: string, email: string): Promise<string> => {
  try {
    const { data, error } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
    if (!error && data?.role) return String(data.role).trim().toLowerCase();
    if (email) {
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .maybeSingle();
      if (!emailError && emailData?.role) return String(emailData.role).trim().toLowerCase();
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

/** Finance portal — only finance_officer sessions are kept. */
export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const applySession = async (session: {
      access_token: string;
      user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
    }) => {
      const dbRole = await fetchUserRoleFromDB(session.user.id, session.user.email || '');
      if (!mounted) return;

      if (isFinancePortalRole(dbRole)) {
        const meta = session.user.user_metadata || {};
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name:
            (meta.name as string) ||
            `${meta.first_name || ''} ${meta.last_name || ''}`.trim() ||
            session.user.email ||
            '',
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
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (mounted && session?.user) {
          await applySession(session);
        }
        if (mounted) dispatch(setInitialized());
      } catch {
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
          setTimeout(() => {
            void (async () => {
              if (!mounted) return;
              if (session?.user && session.access_token) {
                await applySession({
                  access_token: session.access_token,
                  user: session.user,
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
