import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { formatCurrency } from '../../../utils/formatters';
import './FunnelChart.scss';

export interface FunnelStage {
  label: string;
  value: number;
  percentage: number;
  dropOffRate?: number;
  color?: string;
}

interface FunnelChartProps {
  title?: string;
  stages: FunnelStage[];
  showValues?: boolean;
  showPercentages?: boolean;
  maxWidth?: number;
}

export const FunnelChart: React.FC<FunnelChartProps> = React.memo(({
  title,
  stages,
  showValues = true,
  showPercentages = true,
  maxWidth = 100,
}) => {
  if (!stages || stages.length === 0) {
    return (
      <Box className="funnel-chart-container">
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <Box className="funnel-chart-container">
      {title && (
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <Box className="funnel-stages">
        {stages.map((stage, index) => {
          const widthPercentage = maxValue > 0 ? (stage.value / maxValue) * maxWidth : 0;
          const isFirst = index === 0;
          const isLast = index === stages.length - 1;

          return (
            <Box key={index} className="funnel-stage">
              <Box className="funnel-stage-header">
                <Typography variant="body2" className="stage-label" sx={{ fontWeight: 600 }}>
                  {stage.label}
                </Typography>
                <Box className="stage-metrics">
                  {showValues && (
                    <Typography variant="body2" className="stage-value">
                      {stage.value.toLocaleString()}
                    </Typography>
                  )}
                  {showPercentages && (
                    <Typography variant="body2" className="stage-percentage">
                      {stage.percentage.toFixed(1)}%
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box
                className="funnel-bar"
                sx={{
                  width: `${widthPercentage}%`,
                  backgroundColor: stage.color || '#00CFA2',
                  marginLeft: isFirst ? 0 : `${(maxWidth - widthPercentage) / 2}%`,
                  marginRight: isLast ? 0 : `${(maxWidth - widthPercentage) / 2}%`,
                }}
              >
                <Box className="funnel-bar-inner" />
              </Box>
              {stage.dropOffRate !== undefined && stage.dropOffRate > 0 && !isLast && (
                <Box className="drop-off-indicator">
                  <Typography variant="caption" color="error">
                    -{stage.dropOffRate.toFixed(1)}% drop-off
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});

