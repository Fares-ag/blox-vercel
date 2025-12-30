import React from 'react';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import type { SelectProps as MuiSelectProps } from '@mui/material';
import './Select.scss';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<MuiSelectProps, 'variant'> {
  options: SelectOption[];
  error?: boolean;
  helperText?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  label,
  error,
  helperText,
  variant = 'outlined',
  className = '',
  fullWidth = true,
  placeholder,
  id,
  labelId,
  ...props
}) => {
  const reactId = React.useId();
  const resolvedId = id ?? `select-${reactId}`;
  const resolvedLabelId = labelId ?? `select-label-${reactId}`;

  return (
    <FormControl
      className={`custom-select ${className}`}
      fullWidth={fullWidth}
      error={error}
      variant={variant}
    >
      {label && (
        <InputLabel
          id={resolvedLabelId}
          htmlFor={resolvedId}
          // We always use `displayEmpty` so placeholders are common. Shrink the label to
          // prevent overlap between label text and placeholder/value on small screens.
          shrink
          sx={{
            color: '#0E1909',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
            transform: 'translate(14px, 14px) scale(1)',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.85)',
            },
            '&.Mui-focused': {
              color: '#DAFF01',
            },
            '&.Mui-error': {
              color: '#F95668',
            },
          }}
        >
          {label}
        </InputLabel>
      )}
      <MuiSelect
        id={resolvedId}
        labelId={resolvedLabelId}
        label={label}
        displayEmpty
        renderValue={(selected: unknown) => {
          if (selected === '' || selected === null || selected === undefined) {
            return <span style={{ color: '#9CA3AF' }}>{placeholder || 'Select an option'}</span>;
          }
          const selectedOption = options.find(opt => String(opt.value) === String(selected));
          return selectedOption ? selectedOption.label : String(selected);
        }}
        {...props}
        sx={{
          height: '48px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E5E7EB',
            borderWidth: '1px',
          },
          '&:hover': {
            backgroundColor: '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#DAFF01',
              borderWidth: '1px',
            },
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#DAFF01',
              borderWidth: '2px',
            },
          },
          '&.Mui-error': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#F95668',
              borderWidth: '1px',
            },
          },
          '&.Mui-disabled': {
            backgroundColor: '#F9FAFB',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#E5E7EB',
            },
          },
          '& .MuiSelect-select': {
            padding: '0 16px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#000000',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 400,
          },
          '& .MuiSelect-icon': {
            color: '#6B7280',
            right: '12px',
          },
        }}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            <em>{placeholder}</em>
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && (
        <FormHelperText
          sx={{
            fontSize: '12px',
            marginTop: '6px',
            marginLeft: '0',
            color: error ? '#F95668' : '#6B7280',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 400,
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};
