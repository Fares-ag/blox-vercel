import React from 'react';
import type { TextFieldProps } from '@mui/material';
import { DatePicker as MuiDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';
import type { Moment } from 'moment';

export interface DatePickerProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: string | Date | Moment | null;
  onChange: (value: Moment | null) => void;
  format?: string;
  minDate?: string | Date | Moment | null;
  maxDate?: string | Date | Moment | null;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  format = 'DD, MMMM YYYY',
  label,
  minDate,
  maxDate,
  ...props
}) => {
  const momentValue = value ? moment(value) : null;
  const momentMinDate = minDate ? moment(minDate) : undefined;
  const momentMaxDate = maxDate ? moment(maxDate) : undefined;

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <MuiDatePicker
        value={momentValue}
        onChange={onChange}
        format={format}
        minDate={momentMinDate}
        maxDate={momentMaxDate}
        slotProps={{
          textField: {
            ...props,
            label,
            fullWidth: true,
            variant: 'outlined',
            sx: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 'var(--radius-sm)',
                transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
                '& fieldset': {
                  borderColor: 'var(--field-border-color)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--field-border-hover)',
                },
                '&.Mui-focused': {
                  boxShadow: 'var(--field-focus-ring)',
                  '& fieldset': {
                    borderColor: 'var(--field-border-focus)',
                    borderWidth: '2px',
                  },
                },
              },
              '& .MuiInputLabel-root': {
                color: 'var(--field-lable-color)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'var(--field-lable-color)',
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
};
