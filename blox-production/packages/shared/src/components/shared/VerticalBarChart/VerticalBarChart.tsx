import React from 'react';
import { Box, Typography } from '@mui/material';
import './VerticalBarChart.scss';

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface VerticalBarChartProps {
  title: string;
  bars: BarData[];
  maxValue?: number;
}

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  title,
  bars,
  maxValue,
}) => {
  const calculatedMaxValue = maxValue || Math.max(...bars.map((bar) => bar.value), 1);
  const maxBarHeight = 150; // px

  return (
    <Box className="vertical-bar-chart">
      <Typography variant="h4" className="chart-title">
        {title}
      </Typography>
      <Box className="bars-container">
        {bars.map((bar, index) => {
          const height = calculatedMaxValue > 0 ? (bar.value / calculatedMaxValue) * maxBarHeight : 0;
          return (
            <Box key={index} className="bar-item">
              <Box className="bar-wrapper">
                <Box
                  className="bar"
                  sx={{
                    height: `${height}px`,
                    backgroundColor: bar.value > 0 ? bar.color : '#E5E5E5',
                    minHeight: bar.value > 0 ? '8px' : '0',
                  }}
                />
              </Box>
              <Typography variant="body2" className="bar-value">
                {bar.value}
              </Typography>
              <Typography variant="caption" className="bar-label">
                {bar.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
