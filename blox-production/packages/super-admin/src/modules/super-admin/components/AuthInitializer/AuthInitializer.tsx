import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, logout, setInitialized } from '../../store/slices/auth.slice';
import type { User } from '@shared/models/user.model';
import { supabase } from '@shared/services/supabase.service';
import { authService } from '@shared/services/auth.service';

const fetchUserRoleFromDB = async (userId: string, email: string, userMetadata?: { role?: string; user_role?: string; userRole?: string; [key: string]: unknown }): Promise<string> => {
  const roleFromMetadata = userMetadata?.role || userMetadata?.user_role || userMetadata?.userRole;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<string>((resolve) => {
    timeoutId = setTimeout(() => resolve('timeout'), 2000);
  });

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const is406Error = (error as any)?.status === 406 || 
                        error?.code === 'PGRST116' || 
                        error?.message?.includes('406') ||
                        error?.message?.includes('Not Acceptable');

      if (is406Error) {
        return roleFromMetadata || 'customer';
      }

      if (!error && data?.role) {
        return data.role;
      }

      if (error && !is406Error) {
        const { data: emailData, error: emailError } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single();

        if (!emailError && emailData?.role) {
          return emailData.role;
        }

        const isEmail406Error = (emailError as any)?.status === 406 || 
                               emailError?.code === 'PGRST116' || 
                               emailError?.message?.includes('406') ||
                               emailError?.message?.includes('Not Acceptable');

        if (isEmail406Error) {
          return roleFromMetadata || 'customer';
        }
      }

      return roleFromMetadata || 'customer';
    } catch (error: unknown) {
      const err = error as any;
      const is406Error =
        err?.status === 406 ||
        err?.code === 'PGRST116' ||
        String(err?.message || '').includes('406') ||
        String(err?.message || '').includes('Not Acceptable');

      if (is406Error) {
        return roleFromMetadata || 'customer';
      }
      return roleFromMetadata || 'customer';
    }
  })();

  const result = await Promise.race([fetchPromise, timeoutPromise]);
  
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  
  if (result === 'timeout') {
    return roleFromMetadata || 'customer';
  }

  return result as string;
};

export const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && session?.access_token) {
          const role = await fetchUserRoleFromDB(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata
          );

          // Only allow super_admin to access this app
          if (role !== 'super_admin') {
            dispatch(logout());
            await authService.logout();
            navigate('/super-admin/auth/login');
            dispatch(setInitialized());
            return;
          }

          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.first_name && session.user.user_metadata?.last_name
              ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`.trim()
              : session.user.email || '',
            role: role,
            permissions: session.user.user_metadata?.permissions || [],
          };

          dispatch(setCredentials({ user, token: session.access_token }));
        } else {
          dispatch(logout());
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch(logout());
      } finally {
        dispatch(setInitialized());
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        dispatch(logout());
        navigate('/super-admin/auth/login');
      } else if (session?.user) {
        const role = await fetchUserRoleFromDB(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata
        );

        if (role !== 'super_admin') {
          dispatch(logout());
          await authService.logout();
          navigate('/super-admin/auth/login');
          return;
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.first_name && session.user.user_metadata?.last_name
            ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name}`.trim()
            : session.user.email || '',
          role: role,
          permissions: session.user.user_metadata?.permissions || [],
        };

        dispatch(setCredentials({ user, token: session.access_token }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, navigate]);

  return null;
};
