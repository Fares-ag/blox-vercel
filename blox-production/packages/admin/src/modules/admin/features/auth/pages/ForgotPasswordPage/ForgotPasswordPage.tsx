import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Input, Button } from '@shared/components';
import { forgotPasswordSchema } from '@shared/utils/validators';
import { toast } from 'react-toastify';
import { authService } from '@shared/services/auth.service';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import './ForgotPasswordPage.scss';

interface ForgotPasswordFormData {
  email: string;
}

export const ForgotPasswordPage: React.FC = () => {
  // Use shared authService (not portal useAuth) so dealer/credit reuse keeps correct redirects.
  const portalBase = usePortalBasePath();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = useCallback(async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      toast.success('Password reset email sent!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Box className="forgot-password-page">
      <Box className="forgot-password-container">
        <Box className="forgot-password-header">
          <img src="/BloxLogo.png" alt="Blox" className="logo-image" />
          <Typography variant="h2" sx={{ fontWeight: 700, fontSize: 28 }}>Forgot password</Typography>
          <Typography variant="body2" className="subtitle-text">
            Enter your email address and we'll send you a link to reset your password
          </Typography>
        </Box>

        <Box component="form" className="forgot-password-form" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Send Reset Link
          </Button>

          <Box className="back-to-login">
            <Link component={RouterLink} to={withPortalBase(portalBase, '/auth/login')}>
              Back to Login
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
