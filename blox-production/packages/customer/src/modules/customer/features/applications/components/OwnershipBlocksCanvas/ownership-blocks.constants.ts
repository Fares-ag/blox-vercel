export const COLS = 44;
export const ROWS = 20;
export const CELL = 13;
export const GAP = 2;
export const UNIT = CELL + GAP;

export const CANVAS_WIDTH = COLS * UNIT;
export const CANVAS_HEIGHT = ROWS * UNIT;

export const TWEEN_DURATION_MS = 600;

export const COLORS = {
  lime: '#B8D900',
  limeDark: '#9AB800',
  bloxBlack: '#0E1909',
  unfilled: 'rgba(14,25,9,0.1)',
  wheel: 'rgba(154,184,0,0.28)',
} as const;

export const WHEELS = [
  { cx: 0.21, cy: 0.91, r: 0.082 },
  { cx: 0.77, cy: 0.91, r: 0.082 },
] as const;
