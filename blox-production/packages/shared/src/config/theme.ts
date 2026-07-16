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
      contrastText: '#F3F0ED', // Light Grey (replaces white)
    },
    background: {
      default: '#F3F0ED',   // Light Grey - Main background
      paper: '#F3F0ED',     // Light Grey for cards (replaces white)
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
            transition: 'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#8B8778', // Field idle — readable on white
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#787663', // Dark Grey
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 2px #DAFF01', // Brand outer ring
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0E1909', // Black stroke for AA UI contrast
                borderWidth: '2px',
              },
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#8B8778', // Readable unchecked edge
          borderRadius: '4px',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          // Black control on light surfaces (lime-only fills fail ~1.15:1)
          '&.Mui-checked': {
            color: '#0E1909',
            '& .MuiSvgIcon-root': {
              color: '#0E1909',
            },
          },
          '&.Mui-focusVisible': {
            outline: '2px solid #0E1909',
            outlineOffset: 2,
            boxShadow: '0 0 0 4px #DAFF01',
          },
          '&:hover': {
            backgroundColor: 'rgba(14, 25, 9, 0.06)',
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#8B8778',
          '&.Mui-checked': {
            color: '#0E1909',
          },
          '&.Mui-focusVisible': {
            outline: '2px solid #0E1909',
            outlineOffset: 2,
            boxShadow: '0 0 0 4px #DAFF01',
          },
          '&:hover': {
            backgroundColor: 'rgba(14, 25, 9, 0.06)',
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
  
  // Button Colors - Following Design Guidelines (No Green)
  primaryBtnBg: '#DAFF01',       // Lime Yellow - Primary buttons
  primaryBtnColor: '#0E1909',    // Blox Black text on Lime Yellow
  primaryBtnHover: '#B8D900',     // Darker Lime Yellow for hover
  secondaryBtnBg: '#F3F0ED',     // Light Grey - Secondary buttons
  secondaryBtnColor: '#0E1909',  // Blox Black text on Light Grey
  secondaryBtnHover: '#E8E5DF',   // Slightly darker light grey for hover
  secondaryNeutralBg: '#F3F0ED', // Light Grey - Secondary Neutral buttons
  secondaryNeutralColor: '#787663', // Dark Grey text on Light Grey
  secondaryNeutralHover: '#E8E5DF', // Slightly darker light grey for hover
  destructiveBtnBg: '#FFFFFF',    // White - Destructive buttons
  destructiveBtnBorder: '#787663', // Dark Grey border for destructive
  destructiveBtnColor: '#0E1909',  // Blox Black text for destructive
  destructiveBtnHoverBg: '#F3F0ED', // Light Grey for hover
  destructiveBtnHoverBorder: '#787663', // Dark Grey border for hover
  tertiaryBtnColor: '#787663',    // Dark Grey - Tertiary (text only)
  outlineBtnBorder: '#787663',   // Dark Grey border
  // Focus States — dual-tone (black = a11y, lime = brand accent)
  focusRingPrimary: '#0E1909',
  focusRingBrand: '#DAFF01',
  focusRingSecondary: '#0E1909',
  focusRingNeutral: '#787663',
  fieldFocusRing: '0 0 0 2px #DAFF01',
  
  // Form Colors
  fieldLabelColor: '#0E1909',    // Blox Black
  fieldBorderColor: '#8B8778',   // Idle field edge (~3.6:1 on white)
  fieldBorderHover: '#787663',   // Dark Grey
  fieldBorderFocus: '#0E1909',   // Black focus stroke
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
  statusPaid: '#2E7D32',          // Green for paid/success
  statusUnpaid: '#0E1909',       // Blox Black for unpaid (strong)
  statusPartiallyPaid: '#787663', // Dark Grey
  statusDraft: '#C9C4B7',         // Mid Grey for draft
  statusCompleted: '#787663',    // Dark Grey for completed
  statusUnderReview: '#DAFF01',  // Lime Yellow for review
  statusRejected: '#0E1909',      // Blox Black for rejected
  statusContractSigning: '#787663', // Dark Grey
};
