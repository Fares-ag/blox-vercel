import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, setLoading, setError, setCredentials } from '../store/slices/auth.slice';
import { customerAuthService } from '../services/customerAuth.service';
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
        
        const response: AuthResponse = await customerAuthService.login(credentials);
        
        dispatch(setCredentials({ user: response.user, token: response.token }));
        navigate('/customer/my-applications');
        
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
      await customerAuthService.logout();
      dispatch(logout());
      navigate('/customer/auth/login');
    } catch (err) {
      dispatch(logout());
      navigate('/customer/auth/login');
    }
  }, [dispatch, navigate]);

  const handleForgotPassword = useCallback(async (email: string) => {
    try {
      await customerAuthService.forgotPassword(email);
      return { success: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to send password reset email');
      return { success: false, error: error.message };
    }
  }, []);

  const handleResetPassword = useCallback(async (password: string, confirmPassword: string) => {
    try {
      await customerAuthService.resetPassword(password, confirmPassword);
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

