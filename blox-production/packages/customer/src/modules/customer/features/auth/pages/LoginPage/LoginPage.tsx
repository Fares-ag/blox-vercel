import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Checkbox, FormControlLabel, Link, Stack, Alert } from '@mui/material';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../hooks/useAuth';
import { Input, Button } from '@shared/components';
import * as yup from 'yup';
import './LoginPage.scss';

const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email or phone number is required')
    .test('email-or-phone', 'Please enter a valid email or phone number', (value) => {
      if (!value) return false;
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) return true;
      // Check if it's a valid phone number (digits, +, spaces, dashes, parentheses)
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
      if (phoneRegex.test(value.replace(/\s/g, ''))) return true;
      return false;
    }),
  password: yup.string().required('Password is required'),
  rememberMe: yup.boolean().default(false).required(),
});

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

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

  useEffect(() => {
    if (message) {
      toast.info(message, { autoClose: 10000 });
    }
  }, [message]);

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Login successful!');
    } else {
      // Check if error is related to email verification
      if (result.error?.toLowerCase().includes('email') && result.error?.toLowerCase().includes('confirm')) {
        toast.error('Please verify your email address before logging in. Check your inbox for the verification link.');
      } else if (result.error?.toLowerCase().includes('phone number login')) {
        // Specific error for phone login setup issues
        toast.error(result.error || 'Phone number login is not available. Please use your email address.');
      } else {
        toast.error(result.error || 'Login failed. Please check your email/phone and password.');
      }
    }
  };

  const handleQuickLogin = async () => {
    const quickLoginData: LoginFormData = {
      email: 'customer@blox.market',
      password: 'password123',
      rememberMe: true,
    };
    const result = await login(quickLoginData);
    if (result.success) {
      toast.success('Quick login successful! (Using dummy credentials)');
    } else {
      toast.error(result.error || 'Quick login failed');
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-shell">
        <Box className="banner">
          <Typography variant="subtitle1" className="banner-kicker">
            Quick Application Process
          </Typography>
          <Typography variant="body2" className="banner-body">
            With BLOX, your lease is more than just a payment. It's a transparent, flexible system that turns your vehicle's value into virtual assets for smarter financial management.
          </Typography>
          <Button
            variant="primary"
            onClick={() => navigate('/customer/vehicles')}
            className="banner-cta"
            size="small"
          >
            Learn More
          </Button>
        </Box>

        <Box component="form" className="login-form-card" onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="h4" className="form-title">
            Log In
          </Typography>
          <Typography variant="body2" color="text.secondary" className="form-subtitle">
            Login to your existing account
          </Typography>

          {message && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              {message}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Input
              placeholder="Email or phone number"
              label="Email or Phone Number"
              type="text"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message || 'Enter your email address or phone number'}
              autoComplete="username"
            />
            <Input
              placeholder="••••••••••"
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="current-password"
            />
          </Stack>

          <Box className="form-options">
            <FormControlLabel
              control={<Checkbox {...register('rememberMe')} />}
              label="Remember me"
            />
            <Link component={RouterLink} to="/customer/auth/forgot-password" className="forgot-link">
              Forgot Password? <span className="forgot-cta">Reset it</span>
            </Link>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} className="actions-row">
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Log In
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => navigate('/customer/applications/new')}
            >
              Start new application
            </Button>
          </Stack>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              type="button"
              variant="text"
              size="small"
              onClick={handleQuickLogin}
              sx={{
                color: 'text.secondary',
                textDecoration: 'underline',
                fontSize: '12px',
                '&:hover': {
                  textDecoration: 'underline',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Quick Login (No Backend)
            </Button>
          </Box>

          <Box className="signup-link">
            <Typography variant="body2">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/customer/auth/signup">
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
