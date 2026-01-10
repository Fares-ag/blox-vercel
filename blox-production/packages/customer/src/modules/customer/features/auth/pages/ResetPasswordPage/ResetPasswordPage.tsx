import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Link } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '@shared/services/supabase.service';
import { Input, Button } from '@shared/components';
import { resetPasswordSchema } from '@shared/utils/validators';
import './ResetPasswordPage.scss';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      try {
        // Check if there's an active session (Supabase handles this automatically when user clicks reset link)
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && session.user) {
          setSessionValid(true);
          setUserEmail(session.user.email || null);
        } else {
          setSessionValid(false);
          setUserEmail(null);
        }
      } catch (error) {
        setSessionValid(false);
        setUserEmail(null);
      } finally {
        setValidating(false);
      }
    };

    validateSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    const result = await resetPassword(data.password, data.confirmPassword);
    setLoading(false);

    if (result.success) {
      toast.success('Password reset successful!');
      navigate('/customer/auth/login');
    } else {
      toast.error(result.error || 'Failed to reset password');
    }
  };

  if (validating) {
    return (
      <Box className="reset-password-page">
        <Box className="reset-password-container">
          <Typography variant="body1">Validating token...</Typography>
        </Box>
      </Box>
    );
  }

  if (!sessionValid) {
    return (
      <Box className="reset-password-page">
        <Box className="reset-password-container">
          <Typography variant="h3">Invalid Reset Link</Typography>
          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            This reset link is invalid or has expired. Please request a new one.
          </Typography>
          <Link component={RouterLink} to="/customer/auth/forgot-password">
            Request New Reset Link
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="reset-password-page">
      <Box className="reset-password-container">
        <Box className="reset-password-header">
          <img src="/BloxLogoNav.png" alt="Blox Logo" className="logo-image" />
          <Typography variant="h3">Reset Password</Typography>
          {userEmail && (
            <Typography variant="body2" className="subtitle-text" sx={{ mt: 1, mb: 1 }}>
              Resetting password for: <strong>{userEmail}</strong>
            </Typography>
          )}
          <Typography variant="body2" className="subtitle-text">
            Enter your new password
          </Typography>
        </Box>

        <Box component="form" className="reset-password-form" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="New Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message || 'Min 8 chars, uppercase, lowercase, number'}
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Reset Password
          </Button>

          <Box className="back-to-login">
            <Link component={RouterLink} to="/customer/auth/login">
              Back to Login
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

