import { createTheme } from '@mui/material/styles';

// Blox Brand Colors
// Primary: Lime Yellow (#DAFF01) - Hero color for CTAs and highlights
// Blox Black (#0E1909) - Primary text and headers
// Dark Grey (#787663) - Secondary text and borders
// Mid Grey (#C9C4B7) - Dividers and secondary backgrounds
// Light Grey (#F3F0ED) - Main backgrounds and cards

export const theme = createTheme({
  palette: {
    primary: {
      main: '#DAFF01',      // Lime Yellow - Hero color
      dark: '#B8D900',      // Darker shade for hover states
      light: '#E8FF33',     // Lighter shade for light backgrounds
      contrastText: '#0E1909', // Blox Black for text on Lime Yellow
    },
    secondary: {
      main: '#787663',      // Dark Grey - Secondary actions
      dark: '#5A5849',      // Darker shade
      light: '#9A9880',     // Lighter shade
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F3F0ED',   // Light Grey - Main background
      paper: '#FFFFFF',     // White for cards
    },
    text: {
      primary: '#0E1909',   // Blox Black - Primary text
      secondary: '#787663', // Dark Grey - Secondary text
    },
    divider: '#C9C4B7',     // Mid Grey - Dividers
    grey: {
      50: '#F3F0ED',        // Light Grey
      100: '#C9C4B7',       // Mid Grey
      200: '#787663',       // Dark Grey
      300: '#5A5849',       // Darker Grey
      900: '#0E1909',       // Blox Black
    },
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
              borderColor: '#C9C4B7', // Mid Grey
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#DAFF01', // Lime Yellow
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#C9C4B7', // Mid Grey for unchecked
          borderRadius: '4px',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&.Mui-checked': {
            color: '#DAFF01', // Lime Yellow for checked
            '& .MuiSvgIcon-root': {
              color: '#DAFF01', // Ensure checkmark is Lime Yellow
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(218, 255, 1, 0.08)', // Lime Yellow with opacity
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#C9C4B7', // Mid Grey
        },
      },
    },
  },
});

// CSS Variables for brand colors - Blox Brand Palette
export const brandColors = {
  // Primary Brand Colors
  primary: '#DAFF01',           // Lime Yellow - Hero color
  primaryDark: '#B8D900',        // Darker Lime Yellow for hover
  primaryLight: '#E8FF33',       // Lighter Lime Yellow
  bloxBlack: '#0E1909',         // Blox Black - Primary text
  darkGrey: '#787663',          // Dark Grey - Secondary text
  midGrey: '#C9C4B7',           // Mid Grey - Dividers
  lightGrey: '#F3F0ED',         // Light Grey - Backgrounds
  
  // Button Colors
  primaryBtnBg: '#DAFF01',       // Lime Yellow
  primaryBtnColor: '#0E1909',    // Blox Black text on Lime Yellow
  secondaryBtnBg: '#FFFFFF',     // White
  secondaryBtnColor: '#0E1909',  // Blox Black text
  outlineBtnBorder: '#787663',   // Dark Grey border
  
  // Form Colors
  fieldLabelColor: '#0E1909',    // Blox Black
  fieldBorderColor: '#C9C4B7',   // Mid Grey
  fieldBorderFocus: '#DAFF01',   // Lime Yellow focus
  fieldPlaceholder: '#787663',    // Dark Grey
  fieldBackground: '#FFFFFF',     // White
  
  // Table Colors
  tableHeader: '#0E1909',        // Blox Black
  tableHeaderColor: '#DAFF01',   // Lime Yellow text on Blox Black
  tableRowHover: '#F3F0ED',      // Light Grey
  
  // Text Colors
  primaryText: '#0E1909',         // Blox Black
  secondaryText: '#787663',      // Dark Grey
  customTextColor: '#787663',     // Dark Grey
  
  // Background Colors
  background: '#F3F0ED',          // Light Grey
  backgroundSecondary: '#FFFFFF', // White
  cardBackground: '#FFFFFF',      // White
  cardHover: '#F3F0ED',           // Light Grey
  disabledBg: '#C9C4B7',          // Mid Grey
  dividerColor: '#C9C4B7',        // Mid Grey
  
  // Status colors - Adjusted to work with new palette
  statusDue: '#DAFF01',           // Lime Yellow for due/upcoming
  statusActive: '#DAFF01',        // Lime Yellow for active
  statusPaid: '#787663',          // Dark Grey for paid (neutral)
  statusUnpaid: '#0E1909',       // Blox Black for unpaid (strong)
  statusPartiallyPaid: '#787663', // Dark Grey
  statusDraft: '#C9C4B7',         // Mid Grey for draft
  statusCompleted: '#787663',    // Dark Grey for completed
  statusUnderReview: '#DAFF01',  // Lime Yellow for review
  statusRejected: '#0E1909',      // Blox Black for rejected
  statusContractSigning: '#787663', // Dark Grey
};
