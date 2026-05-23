import * as yup from 'yup';
import { sanitizeInput } from './sanitize';

// Transform function to sanitize input
const sanitizeTransform = (value: string) => (typeof value === 'string' ? sanitizeInput(value) : value);

export const emailSchema = yup
  .string()
  .transform(sanitizeTransform)
  .email('Invalid email address')
  .required('Email is required');

export const passwordSchema = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/\d/, 'Password must contain at least one number')
  .required('Password is required');

export const qidSchema = yup
  .string()
  .matches(/^\d{11}$/, 'QID must be exactly 11 digits')
  .required('QID is required');

export const phoneSchema = yup
  .string()
  .transform(sanitizeTransform)
  .required('Phone number is required');

export const requiredStringSchema = yup
  .string()
  .transform(sanitizeTransform)
  .required('This field is required');

export const numberSchema = yup.number().typeError('Must be a number').required('This field is required');

export const positiveNumberSchema = numberSchema.min(0, 'Must be a positive number');

export const dateSchema = yup.date().required('Date is required');

export const loginSchema = yup.object().shape({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: yup.boolean().default(false).required(),
});

export const forgotPasswordSchema = yup.object().shape({
  email: emailSchema,
});

export const resetPasswordSchema = yup.object().shape({
  password: passwordSchema,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});
