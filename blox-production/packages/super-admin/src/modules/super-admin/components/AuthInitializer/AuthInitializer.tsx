import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { authService } from '@shared/services/auth.service';
import { devLogger } from '@shared/utils/logger.util';

interface UserMetadata {
  role?: string;
  user_role?: string;
  userRole?: string;
  first_name?: string;
  last_name?: string;
  permissions?: string[];
  [key: string]: unknown;
}

/**
 * Resolve role from public.users / is_admin() only.
 * Never grant super_admin from JWT user_metadata (client-settable).
 */
const fetchUserRoleFromDB = async (userId: string, email: string): Promise<string> => {
  try {
    const { data: adminFlag, error: adminErr } = await supabase.rpc('is_admin');
    if (!adminErr && adminFlag === true) {
      const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
      const role = (data?.role || '').trim().toLowerCase();
      if (role === 'super_admin') return 'super_admin';
      if (role === 'admin') return 'admin';
      return 'admin';
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.role) {
      const role = String(data.role).trim().toLowerCase();
      if (role === 'admin' || role === 'super_admin' || role === 'customer') return role;
    }

    if (email) {
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .maybeSingle();
      if (!emailError && emailData?.role) {
        const role = String(emailData.role).trim().toLowerCase();
        if (role === 'admin' || role === 'super_admin' || role === 'customer') return role;
      }
    }

    return 'unknown';
  } catch (error) {
    devLogger.debug('Failed to resolve super-admin role from DB', error);
    return 'unknown';
  }
};

export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: {
      access_token: string;
      user: { id: string; email?: string | null; user_metadata?: UserMetadata };
    }) => {
      const dbRole = await fetchUserRoleFromDB(session.user.id, session.user.email || '');
      if (!mounted) return;

      if (dbRole !== 'super_admin') {
        dispatch(logout());
        await authService.logout();
        navigate('/super-admin/auth/login');
        return;
      }

      const meta = session.user.user_metadata || {};
      const user: User = {
        id: session.user.id,
        email: session.user.email || '',
        name: meta.first_name && meta.last_name
          ? `${meta.first_name} ${meta.last_name}`.trim()
          : session.user.email || '',
        role: dbRole,
        permissions: meta.permissions || [],
      };

      dispatch(setCredentials({ user, token: session.access_token }));
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted && session?.user && session?.access_token) {
          await applySession(session);
        } else if (mounted) {
          dispatch(logout());
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) dispatch(logout());
      } finally {
        if (mounted) dispatch(setInitialized());
      }
    };

    void initializeAuth();

    // Defer supabase.* calls — awaiting them inside onAuthStateChange deadlocks the auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const accessToken = session?.access_token;
      const sessionUser = session?.user;

      setTimeout(() => {
        void (async () => {
          if (!mounted) return;
          if (event === 'SIGNED_OUT' || !session || !sessionUser || !accessToken) {
            dispatch(logout());
            navigate('/super-admin/auth/login');
            return;
          }

          await applySession({
            access_token: accessToken,
            user: sessionUser,
          });
        })();
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch, navigate]);

  return null;
};
