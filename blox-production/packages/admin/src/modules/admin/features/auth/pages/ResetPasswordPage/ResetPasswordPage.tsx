import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Link } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Input, Button, Skeleton } from '@shared/components';
import { resetPasswordSchema } from '@shared/utils/validators';
import { toast } from 'react-toastify';
import { supabase } from '@shared/services/supabase.service';
import { authService } from '@shared/services/auth.service';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import './ResetPasswordPage.scss';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export const ResetPasswordPage: React.FC = () => {
  // Shared authService — safe when this page is reused by dealer/credit portals.
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const validateSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionValid(true);
        setUserEmail(session.user.email || null);
      } else {
        setSessionValid(false);
        setUserEmail(null);
      }
    } catch {
      setSessionValid(false);
      setUserEmail(null);
    } finally {
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

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

  const onSubmit = useCallback(async (data: ResetPasswordFormData) => {
    setLoading(true);
    try {
      await authService.resetPassword(data.password);
      toast.success('Password reset successful!');
      navigate(withPortalBase(portalBase, '/auth/login'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }, [navigate, portalBase]);

  if (validating) {
    return (
      <Box className="reset-password-page">
        <Box className="reset-password-container" component="main" display="flex" flexDirection="column" gap={2}>
          <Skeleton height={40} width={180} />
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={44} />
        </Box>
      </Box>
    );
  }

  if (!sessionValid) {
    return (
      <Box className="reset-password-page">
        <Box className="reset-password-container" component="main" aria-labelledby="reset-invalid-title">
          <Typography id="reset-invalid-title" variant="h2" className="welcome-text">
            Invalid reset link
          </Typography>
          <Typography variant="body2" className="subtitle-text session-alert">
            This reset link is invalid or has expired. Please request a new one.
          </Typography>
          <Link component={RouterLink} to={withPortalBase(portalBase, '/auth/forgot-password')}>
            Request new reset link
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="reset-password-page">
      <Box className="reset-password-container" component="main" aria-labelledby="reset-password-title">
        <Box className="reset-password-header">
          <img src="/BloxLogo.png" alt="Blox" className="logo-image" />
          <Typography id="reset-password-title" variant="h2" className="welcome-text">
            Reset password
          </Typography>
          {userEmail ? (
            <Typography variant="body2" className="subtitle-text">
              For <strong>{userEmail}</strong>
            </Typography>
          ) : null}
          <Typography variant="body2" className="subtitle-text">
            Choose a new password for your account
          </Typography>
        </Box>

        <Box component="form" className="reset-password-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="New password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            autoComplete="new-password"
            autoFocus
          />

          <Input
            label="Confirm password"
            type="password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading}>
            Reset password
          </Button>

          <Box className="back-to-login">
            <Link component={RouterLink} to={withPortalBase(portalBase, '/auth/login')}>
              Back to login
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
