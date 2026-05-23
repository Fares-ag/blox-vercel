import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Checkbox, FormControlLabel, Alert } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
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
  const { login, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

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
    } else {
      if (!result.error?.includes('Access denied')) {
        toast.error(result.error || 'Login failed');
      }
    }
  }, [login]);

  return (
    <Box className="login-page">
      <Box className="login-container">
        <Box className="login-header">
          <img src="/BloxLogoNav.png" alt="Blox Logo" className="logo-image" />
          <Typography variant="h3" className="welcome-text">
            Super Admin Portal
          </Typography>
          <Typography variant="body2" className="subtitle-text">
            Sign in to access activity logs and system monitoring
          </Typography>
        </Box>

        <Box component="form" className="login-form" onSubmit={handleSubmit(onSubmit)}>
          {reason === 'not_super_admin' ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Access Denied:</strong> Super administrator privileges required. Only super admin users can access this portal.
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
          </Box>

          <Button
            type="submit"
            variant="contained"
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
