import { useMediaQuery, useTheme } from '@mui/material';

/** Viewport below MUI `md` (900px) — matches SidePanel mobile drawer. */
export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}

/** Viewport below MUI `sm` (600px). */
export function useIsSmallMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
