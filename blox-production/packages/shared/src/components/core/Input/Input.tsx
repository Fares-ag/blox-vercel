import React from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import './Input.scss';

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard';
}

export const Input: React.FC<InputProps> = React.memo(({
  variant = 'outlined',
  className = '',
  sx,
  ...props
}) => {
  const defaultSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 'var(--radius-sm)',
      backgroundColor: variant === 'filled' ? 'var(--disabled-bg)' : 'transparent',
      '& fieldset': {
        borderColor: 'var(--field-border-color)',
      },
      '&:hover fieldset': {
        borderColor: 'var(--field-lable-color)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'var(--field-lable-color)',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'var(--field-lable-color)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'var(--field-lable-color)',
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'var(--field-placeholder)',
      opacity: 1,
    },
  } as const;

  const mergedSx = sx ? [defaultSx, sx] : defaultSx;

  return (
    <TextField
      className={`custom-input ${className}`}
      variant={variant}
      fullWidth
      {...props}
      sx={mergedSx}
      aria-label={props.label || props.placeholder || props.name || 'Input field'}
    />
  );
}, (prevProps, nextProps) => {
  // Memo comparison: re-render if value or key props change
  return prevProps.value === nextProps.value &&
         prevProps.variant === nextProps.variant &&
         prevProps.disabled === nextProps.disabled &&
         prevProps.error === nextProps.error;
});
