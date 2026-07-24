import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TWEEN_DURATION_MS,
} from './ownership-blocks.constants';
import {
  createOwnershipGridFromCanvas,
  cubicEaseInOut,
  drawOwnershipBlocks,
  filledCellCount,
  type OwnershipGrid,
} from './ownership-blocks.engine';
import './OwnershipBlocksCanvas.scss';

export interface OwnershipBlocksCanvasProps {
  ownershipPct: number;
  animate?: boolean;
}

export const OwnershipBlocksCanvas: React.FC<OwnershipBlocksCanvasProps> = ({
  ownershipPct,
  animate = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<OwnershipGrid | null>(null);
  const displayPctRef = useRef(ownershipPct);
  const ownershipPctRef = useRef(ownershipPct);
  const rafRef = useRef<number | null>(null);
  const tweenRef = useRef<{ from: number; to: number; start: number } | null>(null);

  const [displayPct, setDisplayPct] = useState(ownershipPct);

  ownershipPctRef.current = ownershipPct;

  const bloxPct = Math.max(0, Math.min(100, 100 - displayPct));
  const yourPct = Math.max(0, Math.min(100, displayPct));

  useEffect(() => {
    gridRef.current = createOwnershipGridFromCanvas();
  }, []);

  useEffect(() => {
    if (!animate) {
      displayPctRef.current = ownershipPct;
      setDisplayPct(ownershipPct);
      return;
    }

    tweenRef.current = {
      from: displayPctRef.current,
      to: ownershipPct,
      start: performance.now(),
    };
  }, [ownershipPct, animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const resize = () => {
      const scale = Math.min(1, wrap.clientWidth / CANVAS_WIDTH);
      canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const tick = (now: number) => {
      const tween = tweenRef.current;
      if (tween && animate) {
        const elapsed = now - tween.start;
        const progress = Math.min(1, elapsed / TWEEN_DURATION_MS);
        const eased = cubicEaseInOut(progress);
        const next = tween.from + (tween.to - tween.from) * eased;
        displayPctRef.current = next;
        setDisplayPct(next);

        if (progress >= 1) {
          displayPctRef.current = tween.to;
          setDisplayPct(tween.to);
          tweenRef.current = null;
        }
      } else if (!animate) {
        displayPctRef.current = ownershipPctRef.current;
      }

      const grid = gridRef.current;
      if (grid) {
        const filled = filledCellCount(displayPctRef.current, grid.totalCells);
        drawOwnershipBlocks(ctx, grid, filled);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [animate]);

  return (
    <Paper className="ownership-blocks-canvas" sx={{ p: 3, mb: 3 }}>
      <Box className="ownership-blocks-layout">
        <Box className="ownership-blocks-visual">
          <Box className="ownership-blocks-header">
            <Typography variant="h6" fontWeight={700} sx={{ color: 'var(--primary-text)' }}>
              Ownership Journey
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
              Illustrative view based on your payment schedule — not a live LMS ledger
            </Typography>
          </Box>

          <Box className="ownership-blocks-badge-row">
            <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
              Your Ownership
            </Typography>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={Math.round(displayPct)}
                className="ownership-blocks-pct"
                initial={{ scale: 1.15, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {yourPct.toFixed(1)}%
              </motion.span>
            </AnimatePresence>
          </Box>

          <Box ref={wrapRef} className="ownership-blocks-wrap">
            <canvas
              ref={canvasRef}
              aria-label="Vehicle blocks showing your ownership share"
              role="img"
            />
          </Box>

          <Box className="ownership-blocks-legend">
            <Box className="legend-item">
              <span className="legend-swatch legend-swatch--filled" />
              <Typography variant="caption">Your blocks</Typography>
            </Box>
            <Box className="legend-item">
              <span className="legend-swatch legend-swatch--unfilled" />
              <Typography variant="caption">BLOX blocks</Typography>
            </Box>
          </Box>
        </Box>

        <Box className="ownership-blocks-stats">
          <Box className="stat-block">
            <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
              Your Share
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: 'var(--blox-emerald-dark, #00B894)',
                fontFamily: 'var(--font-numeric)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {yourPct.toFixed(1)}%
            </Typography>
            <Box className="stat-bar">
              <Box className="stat-bar-fill stat-bar-fill--lime" sx={{ width: `${yourPct}%` }} />
            </Box>
          </Box>

          <Box className="stat-block">
            <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
              BLOX Share
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: 'var(--primary-text)',
                fontFamily: 'var(--font-numeric)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {bloxPct.toFixed(1)}%
            </Typography>
            <Box className="stat-bar">
              <Box className="stat-bar-fill stat-bar-fill--grey" sx={{ width: `${bloxPct}%` }} />
            </Box>
          </Box>

          <Box className="ownership-blocks-callout">
            <Typography variant="body2" sx={{ color: 'var(--secondary-text)' }}>
              Profit reduces each month as your ownership share grows.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
