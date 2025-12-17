import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import './HorizontalBarChart.scss';

interface HorizontalBarChartProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  showValue?: boolean;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  label,
  value,
  maxValue = 100,
  color = '#008A6C',
  showValue = true,
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <Box className="horizontal-bar-chart">
      <Box className="bar-header">
        <Typography variant="body2" className="bar-label">
          {label}
        </Typography>
        {showValue && (
          <Typography variant="body2" className="bar-value">
            {percentage.toFixed(2)}%
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 24,
          borderRadius: '4px',
          backgroundColor: '#E5E5E5',
          '& .MuiLinearProgress-bar': {
            borderRadius: '4px',
            backgroundColor: color,
          },
        }}
      />
    </Box>
  );
};

interface SegmentedBarChartProps {
  label: string;
  segments: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  total?: number;
}

export const SegmentedBarChart: React.FC<SegmentedBarChartProps> = ({
  label,
  segments,
  total,
}) => {
  const totalValue = total || segments.reduce((sum, seg) => sum + seg.value, 0);
  const segmentPercentages = segments.map((seg) => ({
    ...seg,
    percentage: (seg.value / totalValue) * 100,
  }));

  return (
    <Box className="segmented-bar-chart">
      <Typography variant="body2" className="bar-label" sx={{ marginBottom: 1 }}>
        {label}
      </Typography>
      <Box className="segmented-bar-container">
        {segmentPercentages.map((segment, index) => (
          <Box
            key={index}
            className="segment"
            sx={{
              width: `${segment.percentage}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </Box>
      <Box className="segment-labels">
        {segmentPercentages.map((segment, index) => (
          <Typography key={index} variant="body2" className="segment-label" sx={{ color: segment.color }}>
            {segment.percentage.toFixed(2)}% {segment.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};
