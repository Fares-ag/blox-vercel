import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material';
import './Button.scss';

// We support a small set of custom variants, plus a few aliases for MUI-style variants
// to make migrations easier in app code.
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outlined'
  | 'contained'
  | 'text'
  | 'icon'
  | 'small';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'outlined':
        // Backward-compat alias (maps to our secondary styling)
        return 'btn-secondary';
      case 'contained':
        // MUI alias → primary
        return 'btn-primary';
      case 'text':
        // MUI alias → secondary (lightweight)
        return 'btn-secondary';
      case 'icon':
        return 'btn-icon';
      case 'small':
        return 'btn-small';
      default:
        return 'btn-primary';
    }
  };

  const isIconButton = variant === 'icon';

  return (
    <MuiButton
      className={`custom-button ${getVariantClass()} ${className}`}
      disabled={disabled || loading}
      {...props}
      sx={
        isIconButton
          ? {
              minWidth: '40px',
              width: '40px',
              height: '40px',
              padding: 0,
            }
          : undefined
      }
    >
      {loading ? (
        <CircularProgress size={20} color={variant === 'primary' ? 'inherit' : 'primary'} />
      ) : (
        children
      )}
    </MuiButton>
  );
};
