import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@admin-module/store/hooks';
import { logout, setLoading, setError, setCredentials } from '@admin-module/store/slices/auth.slice';
import { authService } from '@shared/services/auth.service';
import type { LoginCredentials, AuthResponse } from '@shared/models/user.model';
import { isCreditPortalRole } from '@shared/utils/rbac';

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
        if (!isCreditPortalRole(response.user.role)) {
          await authService.logout();
          const errorMessage =
            'Access denied: Credit officer privileges are required for this portal.';
          dispatch(setError(errorMessage));
          return { success: false, error: errorMessage };
        }
        dispatch(setCredentials({ user: response.user, token: response.token }));
        navigate('/credit/queue');
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
    } catch {
      // ignore
    }
    dispatch(logout());
    navigate('/credit/auth/login');
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
