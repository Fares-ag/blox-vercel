import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../hooks/useAuth';
import { Input, Button } from '@shared/components';
import { forgotPasswordSchema } from '@shared/utils/validators';
import './ForgotPasswordPage.scss';

interface ForgotPasswordFormData {
  email: string;
}

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword } = useAuth();
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

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    const result = await forgotPassword(data.email);
    setLoading(false);

    if (result.success) {
      toast.success('Password reset email sent! Please check your inbox.');
    } else {
      toast.error(result.error || 'Failed to send reset email');
    }
  };

  return (
    <Box className="forgot-password-page">
      <Box className="forgot-password-container">
        <Box className="forgot-password-header">
          <img src="/BloxLogoDark.png" alt="Blox Logo" className="logo-image" />
          <Typography variant="h3">Forgot Password</Typography>
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
            <Link component={RouterLink} to="/customer/auth/login">
              Back to Login
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

