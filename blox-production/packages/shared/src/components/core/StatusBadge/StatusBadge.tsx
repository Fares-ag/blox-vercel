import React from 'react';
import { Chip } from '@mui/material';
import './StatusBadge.scss';
import { getStatusColor } from '../../../utils/formatters';

export interface StatusBadgeProps {
  status: string;
  type?: 'application' | 'payment';
}

const LIME_STATUS_VARS = new Set([
  'var(--status-due)',
  'var(--status-active)',
  'var(--status-under-review)',
]);

const isLimeFill = (bgColor: string): boolean => {
  if (LIME_STATUS_VARS.has(bgColor)) return true;
  const normalized = bgColor.toLowerCase();
  return normalized.includes('daff01') || normalized.includes('b8d900');
};

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({ status, type = 'application' }) => {
  const getColor = () => {
    if (type === 'payment') {
      const paymentStatuses: Record<string, string> = {
        due: 'var(--status-due)',
        active: 'var(--status-active)',
        paid: 'var(--status-paid)',
        unpaid: 'var(--status-unpaid)',
        partially_paid: 'var(--status-partially-paid)',
        upcoming: 'var(--status-active)',
      };
      return paymentStatuses[status.toLowerCase()] || 'var(--custom-text-color)';
    }
    return getStatusColor(status);
  };

  const formattedStatus = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const backgroundColor = getColor();
  const limeFill = isLimeFill(backgroundColor);

  const getTextColor = (bgColor: string): string => {
    if (limeFill) {
      return 'var(--blox-black)';
    }
    if (bgColor.startsWith('var(--')) {
      return '#FFFFFF';
    }
    if (bgColor.includes('FFC107') || bgColor.includes('FF9800')) {
      return '#0E1909';
    }
    if (
      bgColor.includes('2196F3') ||
      bgColor.includes('4CAF50') ||
      bgColor.includes('9C27B0') ||
      bgColor.includes('F44336') ||
      bgColor.includes('757575')
    ) {
      return '#FFFFFF';
    }
    if (bgColor.includes('787663') || bgColor.includes('C9C4B7')) {
      return '#FFFFFF';
    }
    return '#FFFFFF';
  };

  return (
    <Chip
      label={formattedStatus}
      className="status-badge"
      sx={{
        backgroundColor: backgroundColor,
        color: getTextColor(backgroundColor),
        fontWeight: 600,
        fontSize: '13px',
        height: '26px',
        px: 1,
        // Lime chips dissolve into #F3F0ED without an edge
        border: limeFill ? '1px solid var(--blox-black)' : '1px solid transparent',
      }}
    />
  );
});
