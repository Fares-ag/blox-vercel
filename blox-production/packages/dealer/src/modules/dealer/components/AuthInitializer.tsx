import { useEffect } from 'react';
import { useAppDispatch } from '@admin-module/store/hooks';
import { setCredentials, logout, setInitialized } from '@admin-module/store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { loggingService } from '@shared/services/logging.service';
import { isDealerPortalRole } from '@shared/utils/rbac';

const fetchUserFromDB = async (
  userId: string,
  email: string
): Promise<{ role: string; companyId?: string }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data?.role) {
      return {
        role: String(data.role).trim().toLowerCase(),
        companyId: (data as { company_id?: string }).company_id || undefined,
      };
    }
    if (email) {
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('email', email)
        .maybeSingle();
      if (!emailError && emailData?.role) {
        return {
          role: String(emailData.role).trim().toLowerCase(),
          companyId: (emailData as { company_id?: string }).company_id || undefined,
        };
      }
    }
    return { role: 'unknown' };
  } catch {
    return { role: 'unknown' };
  }
};

/** Dealer portal — only dealer_agent sessions are kept. */
export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const applySession = async (session: {
      access_token: string;
      user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
    }) => {
      const { role: dbRole, companyId } = await fetchUserFromDB(
        session.user.id,
        session.user.email || ''
      );
      if (!mounted) return;

      if (isDealerPortalRole(dbRole)) {
        const meta = session.user.user_metadata || {};
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: (meta.name as string) ||
            `${meta.first_name || ''} ${meta.last_name || ''}`.trim() ||
            session.user.email ||
            '',
          role: dbRole,
          companyId,
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
