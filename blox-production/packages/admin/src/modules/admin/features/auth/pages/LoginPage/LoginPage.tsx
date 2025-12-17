import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Checkbox, FormControlLabel, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
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

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Login successful!');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-container">
        <Box className="login-header">
          <img src="/BloxLogo.png" alt="Blox Logo" className="logo-image" />
          <Typography variant="h3" className="welcome-text">
            Welcome Back
          </Typography>
          <Typography variant="body2" className="subtitle-text">
            Sign in to continue to your account
          </Typography>
        </Box>

        <Box component="form" className="login-form" onSubmit={handleSubmit(onSubmit)}>
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
            <Link component={RouterLink} to="/admin/auth/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </Box>

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Sign In
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
