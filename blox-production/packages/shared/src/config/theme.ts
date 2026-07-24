import { createTheme } from '@mui/material/styles';
import { bloxAtmosphere, bloxBrand, bloxFonts } from './brand-tokens';

/**
 * MUI theme — premium teal composition (PDF v1.0).
 * Deep green foundation · emerald wealth · lime CTA · misted surfaces.
 */

export const theme = createTheme({
  palette: {
    /**
     * Direction A root-cause fix: emerald is the everyday interactive accent,
     * NOT lime. Lime is reserved for the single hero CTA per screen
     * (see `.btn-primary` / `.blox-cta-hero`).
     */
    primary: {
      main: bloxBrand.emerald,
      dark: bloxBrand.emeraldDark,
      light: bloxBrand.emeraldLight,
      contrastText: bloxBrand.deepGreenDark,
    },
    secondary: {
      main: bloxBrand.deepGreen,
      dark: bloxBrand.deepGreenDark,
      light: '#1A6B74',
      contrastText: bloxBrand.white,
    },
    background: {
      default: bloxBrand.pageBg,
      paper: bloxBrand.surface,
    },
    text: {
      primary: bloxBrand.deepGreen,
      secondary: bloxBrand.slate,
    },
    divider: 'rgba(168, 178, 188, 0.55)',
    grey: {
      50: bloxBrand.pageBg,
      100: bloxBrand.surfaceMuted,
      200: bloxBrand.slateLight,
      300: bloxBrand.slate,
      900: bloxBrand.deepGreenDark,
    },
  },
  typography: {
    fontFamily: bloxFonts.text,
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
    '0 1px 2px 0 rgba(22, 83, 91, 0.05)',
    '0 1px 3px 0 rgba(22, 83, 91, 0.08), 0 1px 2px -1px rgba(22, 83, 91, 0.04)',
    '0 4px 6px -1px rgba(22, 83, 91, 0.08), 0 2px 4px -2px rgba(22, 83, 91, 0.04)',
    '0 10px 15px -3px rgba(22, 83, 91, 0.1), 0 4px 6px -4px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
    '0 20px 25px -5px rgba(22, 83, 91, 0.1), 0 8px 10px -6px rgba(22, 83, 91, 0.05)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontFamily: bloxFonts.text,
          fontSize: '15px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          borderRadius: '12px',
          padding: '11px 22px',
          transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: 'none',
        },
        // Everyday primary = emerald (interactive accent)
        containedPrimary: {
          backgroundColor: bloxBrand.emerald,
          color: bloxBrand.deepGreenDark,
          boxShadow: bloxAtmosphere.emeraldGlow,
          '&:hover': {
            backgroundColor: bloxBrand.emeraldDark,
            color: bloxBrand.white,
            boxShadow: '0 10px 26px rgba(0, 207, 162, 0.28)',
          },
        },
        // Structural secondary = deep green
        containedSecondary: {
          backgroundColor: bloxBrand.deepGreen,
          color: bloxBrand.white,
          boxShadow: bloxAtmosphere.softShadow,
          '&:hover': {
            backgroundColor: bloxBrand.deepGreenDark,
          },
        },
        outlined: {
          borderColor: 'rgba(22, 83, 91, 0.28)',
          color: bloxBrand.deepGreen,
          backgroundColor: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            borderColor: bloxBrand.emerald,
            backgroundColor: bloxBrand.emeraldWash,
          },
        },
      },
      variants: [
        {
          // The precious lime hero CTA — one per screen. Deep-green text always.
          props: { className: 'blox-cta-hero' },
          style: {
            backgroundColor: bloxBrand.lime,
            color: bloxBrand.deepGreen,
            boxShadow: bloxAtmosphere.limeGlow,
            '&:hover': {
              backgroundColor: bloxBrand.limeDark,
              boxShadow: '0 12px 30px rgba(219, 255, 0, 0.36)',
            },
          },
        },
      ],
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '18px',
          backgroundImage: 'none',
          boxShadow: bloxAtmosphere.softShadow,
          border: bloxAtmosphere.cardBorder,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '18px',
          boxShadow: bloxAtmosphere.softShadow,
          border: bloxAtmosphere.cardBorder,
          transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          '&:hover': {
            boxShadow: bloxAtmosphere.liftShadow,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: bloxAtmosphere.chromeGradient,
          color: bloxBrand.white,
          boxShadow: '0 8px 24px rgba(15, 58, 64, 0.18)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            transition:
              'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: bloxBrand.slate,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: bloxBrand.slateDark,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px rgba(0, 207, 162, 0.18)`,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: bloxBrand.deepGreen,
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
          color: bloxBrand.slate,
          borderRadius: '4px',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&.Mui-checked': {
            color: bloxBrand.deepGreen,
            '& .MuiSvgIcon-root': {
              color: bloxBrand.deepGreen,
            },
          },
          '&.Mui-focusVisible': {
            outline: `2px solid ${bloxBrand.deepGreen}`,
            outlineOffset: 2,
            boxShadow: `0 0 0 4px rgba(0, 207, 162, 0.20)`,
          },
          '&:hover': {
            backgroundColor: 'rgba(22, 83, 91, 0.06)',
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: bloxBrand.slate,
          '&.Mui-checked': {
            color: bloxBrand.deepGreen,
          },
          '&.Mui-focusVisible': {
            outline: `2px solid ${bloxBrand.deepGreen}`,
            outlineOffset: 2,
            boxShadow: `0 0 0 4px rgba(0, 207, 162, 0.20)`,
          },
          '&:hover': {
            backgroundColor: 'rgba(22, 83, 91, 0.06)',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: bloxBrand.slateLight,
        },
      },
    },
  },
});

/** CSS / TS brand color map used by components and exports */
export const brandColors = {
  primary: bloxBrand.lime,
  primaryDark: bloxBrand.limeDark,
  primaryLight: bloxBrand.limeLight,
  bloxBlack: bloxBrand.deepGreen,
  deepGreen: bloxBrand.deepGreen,
  emerald: bloxBrand.emerald,
  slate: bloxBrand.slate,
  darkGrey: bloxBrand.slate,
  midGrey: bloxBrand.slateLight,
  lightGrey: bloxBrand.pageBg,

  primaryBtnBg: bloxBrand.lime,
  primaryBtnColor: bloxBrand.deepGreen,
  primaryBtnHover: bloxBrand.limeDark,
  secondaryBtnBg: bloxBrand.emeraldWash,
  secondaryBtnColor: bloxBrand.deepGreen,
  secondaryBtnHover: '#D4F7EE',
  secondaryNeutralBg: bloxBrand.surfaceMuted,
  secondaryNeutralColor: bloxBrand.slateDark,
  secondaryNeutralHover: '#DCE6E6',
  destructiveBtnBg: bloxBrand.white,
  destructiveBtnBorder: bloxBrand.slate,
  destructiveBtnColor: bloxBrand.deepGreen,
  destructiveBtnHoverBg: bloxBrand.pageBgWarm,
  destructiveBtnHoverBorder: bloxBrand.slate,
  tertiaryBtnColor: bloxBrand.slate,
  outlineBtnBorder: 'rgba(22, 83, 91, 0.28)',

  focusRingPrimary: bloxBrand.deepGreen,
  focusRingBrand: bloxBrand.emerald,
  focusRingSecondary: bloxBrand.emerald,
  focusRingNeutral: bloxBrand.slate,
  fieldFocusRing: `0 0 0 2px ${bloxBrand.deepGreen}, 0 0 0 5px rgba(0, 207, 162, 0.18)`,

  fieldLabelColor: bloxBrand.deepGreen,
  fieldBorderColor: bloxBrand.slate,
  fieldBorderHover: bloxBrand.deepGreen,
  fieldBorderFocus: bloxBrand.deepGreen,
  fieldPlaceholder: bloxBrand.slateLight,
  fieldBackground: bloxBrand.white,

  tableHeader: bloxBrand.deepGreenDark,
  tableHeaderColor: bloxBrand.white,
  tableRowHover: bloxBrand.pageBgWarm,

  primaryText: bloxBrand.deepGreen,
  secondaryText: bloxBrand.slate,
  customTextColor: bloxBrand.slate,

  background: bloxBrand.pageBg,
  backgroundSecondary: bloxBrand.white,
  cardBackground: bloxBrand.white,
  cardHover: '#F5FAFA',
  disabledBg: bloxBrand.slateLight,
  dividerColor: 'rgba(168, 178, 188, 0.55)',

  statusDue: bloxBrand.lime,
  statusActive: bloxBrand.emerald,
  statusPaid: bloxBrand.emerald,
  statusUnpaid: bloxBrand.deepGreen,
  statusPartiallyPaid: bloxBrand.slate,
  statusDraft: bloxBrand.slateLight,
  statusCompleted: bloxBrand.emeraldDark,
  statusUnderReview: bloxBrand.slate,
  statusRejected: bloxBrand.destructive,
  statusContractSigning: bloxBrand.emerald,

  atmosphere: bloxAtmosphere,
};

export { bloxAtmosphere, bloxBrand, bloxFonts };
