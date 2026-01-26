import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { setCredentials, setLoading, setError, logout } from '../store/slices/auth.slice';
import { authService } from '@shared/services/auth.service';
import type { LoginCredentials } from '@shared/models/user.model';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      const response = await authService.login(credentials);
      
      // Check if user is super_admin
      if (response.user.role !== 'super_admin') {
        await authService.logout();
        dispatch(logout());
        dispatch(setError('Access denied: Super administrator privileges required.'));
        return { success: false, error: 'Access denied: Super administrator privileges required.' };
      }

      dispatch(setCredentials({ user: response.user, token: response.token }));
      navigate('/super-admin/dashboard');
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch(setError(errorMessage));
      return { success: false, error: errorMessage };
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigate('/super-admin/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [dispatch, navigate]);

  return {
    login,
    logout: handleLogout,
    loading: false,
    error: null,
  };
};
