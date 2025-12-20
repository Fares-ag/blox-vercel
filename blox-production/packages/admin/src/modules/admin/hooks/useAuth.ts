import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, setLoading, setError, setCredentials } from '../store/slices/auth.slice';
import { authService } from '@shared/services/auth.service';
import type { LoginCredentials, AuthResponse } from '@shared/models/user.model';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);

  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        dispatch(setLoading(true));
        dispatch(setError(null));
        
        const response: AuthResponse = await authService.login(credentials);
        
        // CRITICAL: Check if user is admin before allowing login
        if (response.user.role !== 'admin') {
          // Sign out immediately - they shouldn't be logged in
          await authService.logout();
          const errorMessage = 'Access denied: Administrator privileges required. Only admin users can access this portal.';
          dispatch(setError(errorMessage));
          return { success: false, error: errorMessage };
        }
        
        // Only set credentials if user is admin
        dispatch(setCredentials({ user: response.user, token: response.token }));
        navigate('/admin/dashboard');
        
        return { success: true };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Login failed');
        dispatch(setError(error.message));
        return { success: false, error: error.message };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, navigate]
  );

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigate('/admin/auth/login');
    } catch (err) {
      // Even if API call fails, clear local state
      dispatch(logout());
      navigate('/admin/auth/login');
    }
  }, [dispatch, navigate]);

  const handleForgotPassword = useCallback(async (email: string) => {
    try {
      await authService.forgotPassword(email);
      return { success: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to send password reset email');
      return { success: false, error: error.message };
    }
  }, []);

  const handleResetPassword = useCallback(async (password: string) => {
    try {
      await authService.resetPassword(password);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
  };
};

