/**
 * Blox brand tokens — system of record: Blox_Branding.pdf v1.0 (teal stack).
 * Premium composition: deep green foundation, emerald wealth accents, lime CTAs.
 * Do not introduce a second palette. Map all UI/PDF/email colors through these.
 */

export const bloxBrand = {
  deepGreen: '#16535B',
  /** Darker chrome for sidebars / heroes */
  deepGreenDark: '#0F3A40',
  emerald: '#00CFA2',
  emeraldDark: '#00B894',
  emeraldLight: '#4DD9B8',
  emeraldWash: '#E6FBF5',
  lime: '#DBFF00',
  limeDark: '#C4E600',
  limeLight: '#E8FF66',
  limeWash: '#F7FFE0',
  white: '#FFFFFF',
  /** PDF swatch mislabeled "WHITE" — slate / secondary chrome */
  slate: '#708090',
  slateDark: '#4A5560',
  slateLight: '#A8B2BC',
  pageBg: '#F0F5F5',
  pageBgWarm: '#EEF3F3',
  surface: '#FFFFFF',
  surfaceMuted: '#E8F0F0',
  overlay: 'rgba(15, 58, 64, 0.48)',
  destructive: '#C62828',
} as const;

/**
 * Atmosphere — Direction A (Restrained Luxury).
 * Calm misted canvas for content; deep-green gradients reserved for the ONE
 * dark moment per view (hero / nav). No washes behind ordinary content.
 */
export const bloxAtmosphere = {
  /** Content canvas — near-flat, barely-there cool vignette. */
  pageCanvas: '#F0F5F5',
  pageVignette:
    'radial-gradient(1400px 700px at 50% -20%, #F4F9F9 0%, #F0F5F5 55%, #EAF1F1 100%)',
  /** Dark chrome (nav / sidebar). */
  chromeGradient: 'linear-gradient(168deg, #1B6068 0%, #16535B 45%, #0F3A40 100%)',
  /** Editorial hero panel. */
  heroGradient: 'linear-gradient(150deg, #0F3A40 0%, #16535B 58%, #1B6C75 100%)',
  /** Subtle depth accents inside a dark hero only. */
  heroGlow:
    'radial-gradient(600px 300px at 85% -10%, rgba(0, 207, 162, 0.22), transparent 60%), radial-gradient(420px 240px at 100% 110%, rgba(219, 255, 0, 0.10), transparent 55%)',
  cardBorder: '1px solid rgba(22, 83, 91, 0.08)',
  hairline: 'rgba(22, 83, 91, 0.08)',
  limeGlow: '0 10px 26px rgba(219, 255, 0, 0.28)',
  emeraldGlow: '0 8px 22px rgba(0, 207, 162, 0.20)',
  /** Two-level teal shadow system. */
  softShadow:
    '0 1px 2px rgba(15, 58, 64, 0.04), 0 6px 18px rgba(22, 83, 91, 0.06)',
  liftShadow:
    '0 14px 34px rgba(15, 58, 64, 0.12), 0 4px 12px rgba(0, 207, 162, 0.07)',
} as const;

export const bloxFonts = {
  text: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  numeric: '"Space Grotesk", "IBM Plex Sans", sans-serif',
} as const;

export type BloxBrandKey = keyof typeof bloxBrand;
