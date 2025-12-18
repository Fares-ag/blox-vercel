import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#00CFA2',
      dark: '#00B892',
      light: '#00E6C2',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2E2C34',
      dark: '#1a1a1f',
      light: '#3a3844',
    },
    background: {
      default: '#F1F2F4',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',   // near-black for readability
      secondary: '#4B5563', // darker grey for secondary text
    },
    divider: '#e5e7eb',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: '40px',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '28px',
      fontWeight: 700,
      lineHeight: '36px',
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: '28px',
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: '24px',
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: '20px',
    },
    body1: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: '22px',
    },
    body2: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: '18px',
    },
    caption: {
      fontSize: '11px',
      fontWeight: 400,
      lineHeight: '16px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: '15px',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          borderRadius: '10px',
          padding: '10px 20px',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00CFA2',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00CFA2',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#9ca3af',
          borderRadius: '4px',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&.Mui-checked': {
            color: '#00CFA2',
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 207, 162, 0.08)',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#e5e7eb',
        },
      },
    },
  },
});

// CSS Variables for brand colors
export const brandColors = {
  primary: '#00CFA2',
  primaryDark: '#00B892',
  primaryLight: '#00E6C2',
  secondary: '#2E2C34',
  secondaryDark: '#1a1a1f',
  secondaryLight: '#3a3844',
  primaryBtnBg: '#00CFA2',
  primaryBtnColor: '#FFFFFF',
  secondaryBtnBg: '#FFFFFF',
  secondaryBtnColor: '#16535B',
  fieldLabelColor: '#16535B',
  tableHeader: '#008A6C',
  tableHeaderColor: '#FFFFFF',
  customTextColor: '#6B7280',
  fieldBorderColor: '#9CA3AF',
  fieldBorderFocus: '#00CFA2',
  primaryText: '#111827',
  secondaryText: '#4B5563',
  fieldPlaceholder: '#648C92',
  background: '#F1F2F4',
  backgroundSecondary: '#f3f4f6',
  cardBackground: '#FFFFFF',
  cardHover: '#fafafa',
  disabledBg: '#EDEDEF',
  dividerColor: '#e5e7eb',
  // Status colors
  statusDue: '#E2B13C',
  statusActive: '#007AFF',
  statusPaid: '#09C97F',
  statusUnpaid: '#F95668',
  statusPartiallyPaid: '#F95668',
  statusDraft: '#E2B13C',
  statusCompleted: '#09C97F',
  statusUnderReview: '#CF8900',
  statusRejected: '#D65D5D',
  statusContractSigning: '#16535B',
};
