import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Checkbox, FormControlLabel, Link, Alert } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../hooks/useAuth';
import { Input, Button } from '@shared/components';
import { loginSchema } from '@shared/utils/validators';
import './LoginPage.scss';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const LoginPage: React.FC = () => {
  const { login, loading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const showAccessDenied =
    reason === 'not_admin' ||
    Boolean(error && (error.includes('Access denied') || error.includes('Administrator privileges')));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = useCallback(async (data: LoginFormData) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Login successful!');
    } else if (
      !result.error?.includes('Access denied') &&
      !result.error?.includes('Administrator privileges')
    ) {
      toast.error(result.error || 'Login failed');
    }
  }, [login]);

  return (
    <Box className="login-page">
      <Box className="login-container" component="main" aria-labelledby="admin-login-title">
        <Box className="login-header">
          <img src="/BloxLogo.png" alt="Blox" className="logo-image" />
          <Typography id="admin-login-title" variant="h2" className="welcome-text">
            Admin Portal
          </Typography>
          <Typography variant="overline" className="brand-tagline" sx={{ letterSpacing: '0.12em', color: 'text.secondary' }}>
            Finance Unboxed
          </Typography>
          <Typography variant="body2" className="subtitle-text">
            Sign in to manage applications, vehicles, and operations
          </Typography>
        </Box>

        <Box component="form" className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {showAccessDenied ? (
            <Alert severity="error" className="login-alert" role="alert">
              <Typography variant="body2">
                <strong>Access denied.</strong> Administrator privileges are required. Dealer agents
                and credit officers should use their own portals.
              </Typography>
            </Alert>
          ) : null}

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="current-password"
          />

          <Box className="form-options">
            <FormControlLabel
              control={<Checkbox {...register('rememberMe')} />}
              label="Remember me"
            />
            <Link component={RouterLink} to="/admin/auth/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </Box>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
