import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Link } from '@mui/material';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { customerAuthService, type SignUpData } from '../../../../services/customerAuth.service';
import { Input, Button, Select } from '@shared/components';
import * as yup from 'yup';
import { emailSchema, passwordSchema, qidSchema, phoneSchema, requiredStringSchema } from '@shared/utils/validators';
import { getNationalityFromQID } from '@shared/utils/nationality.utils';
import './SignUpPage.scss';

const signUpSchema = yup.object().shape({
  first_name: requiredStringSchema,
  last_name: requiredStringSchema,
  email: emailSchema,
  phone_number: phoneSchema,
  qid: qidSchema,
  gender: yup.string().oneOf(['Male', 'Female'], 'Gender is required').required('Gender is required'),
  password: passwordSchema,
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  nationality: yup.string().required('Nationality is required'),
});

interface SignUpFormData extends SignUpData {
  confirm_password: string;
}

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      qid: '',
      gender: 'Male',
      password: '',
      confirm_password: '',
      nationality: '',
    },
  });

  const qidValue = watch('qid');

  // Auto-extract nationality from QID (read-only; not user-editable)
  useEffect(() => {
    const detectedNationality = getNationalityFromQID(qidValue || '');
    setValue('nationality', detectedNationality || '', { shouldValidate: Boolean(qidValue) });
  }, [qidValue, setValue]);

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      await customerAuthService.signup(data);
      toast.success('Registration successful! Please login.');
      navigate('/customer/auth/login', { state: location.state });
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="signup-page">
      <Box className="signup-container">
        <Box className="signup-header">
          <img src="/BloxLogo.png" alt="Blox Logo" className="logo-image" />
          <Typography variant="h3" className="welcome-text">
            Create Account
          </Typography>
          <Typography variant="body2" className="subtitle-text">
            Sign up to get started with Blox
          </Typography>
        </Box>

        <Box component="form" className="signup-form" onSubmit={handleSubmit(onSubmit)}>
          <Box className="form-row">
            <Input
              label="First Name"
              {...register('first_name')}
              error={!!errors.first_name}
              helperText={errors.first_name?.message}
              fullWidth
            />
            <Input
              label="Last Name"
              {...register('last_name')}
              error={!!errors.last_name}
              helperText={errors.last_name?.message}
              fullWidth
            />
          </Box>

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            autoComplete="email"
          />

          <Input
            label="Phone Number"
            type="tel"
            {...register('phone_number')}
            error={!!errors.phone_number}
            helperText={errors.phone_number?.message}
            autoComplete="tel"
          />

          <Box className="form-row">
            <Input
              label="QID"
              {...register('qid')}
              error={!!errors.qid}
              helperText={errors.qid?.message || '11-digit Qatar ID'}
              inputProps={{ maxLength: 11 }}
            />
            <Select
              label="Gender"
              {...register('gender')}
              error={!!errors.gender}
              helperText={errors.gender?.message}
              options={genderOptions}
            />
          </Box>

          <Input
            label="Nationality"
            {...register('nationality')}
            error={!!errors.nationality}
            helperText={errors.nationality?.message || 'Auto-filled from QID'}
            placeholder="—"
            InputProps={{ readOnly: true }}
            variant="filled"
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message || 'Min 8 chars, uppercase, lowercase, number'}
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register('confirm_password')}
            error={!!errors.confirm_password}
            helperText={errors.confirm_password?.message}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Sign Up
          </Button>

          <Box className="login-link">
            <Typography variant="body2">
              Already have an account?{' '}
              <Link component={RouterLink} to="/customer/auth/login" state={location.state}>
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

