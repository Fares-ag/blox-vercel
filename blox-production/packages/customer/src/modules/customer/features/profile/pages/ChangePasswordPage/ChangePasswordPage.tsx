import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, TextField, Button, Alert } from '@mui/material';
import { ArrowBack, Lock } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import { toast } from 'react-toastify';
import './ChangePasswordPage.scss';

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword =
        'Password must contain uppercase, lowercase, and number';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // await apiService.put('/customer/change-password', {
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword,
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Password changed successfully');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="change-password-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        className="back-button"
      >
        Back
      </Button>

      <Typography variant="h4" className="page-title">
        Change Password
      </Typography>

      <Paper className="password-card">
        <Box className="header-icon">
          <Lock sx={{ fontSize: 48, color: '#DAFF01' }} />
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Your password must be at least 8 characters and contain uppercase, lowercase, and numbers.
        </Alert>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            sx={{ mb: 3 }}
          />

          <Box className="action-buttons">
            <CustomButton variant="primary" type="submit" loading={loading}>
              Change Password
            </CustomButton>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};


