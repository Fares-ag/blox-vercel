import React from 'react';
import { Chip } from '@mui/material';
import './StatusBadge.scss';
import { getStatusColor } from '../../../utils/formatters';

export interface StatusBadgeProps {
  status: string;
  type?: 'application' | 'payment';
}

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({ status, type = 'application' }) => {
  const getColor = () => {
    if (type === 'payment') {
      // Payment status colors
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
    // Application status colors
    return getStatusColor(status);
  };

  const formattedStatus = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const backgroundColor = getColor();
  // Determine text color based on background for proper contrast
  // Lime Yellow (#DAFF01) needs dark text, others use white
  const getTextColor = (bgColor: string): string => {
    if (bgColor === 'var(--status-due)' || bgColor === 'var(--status-active)' || bgColor === '#DAFF01') {
      return '#0E1909'; // Blox Black for Lime Yellow backgrounds
    }
    if (bgColor === 'var(--status-paid)' || bgColor === '#787663' || bgColor === '#C9C4B7') {
      return '#FFFFFF'; // White for grey backgrounds
    }
    return '#FFFFFF'; // Default to white
  };

  return (
    <Chip
      label={formattedStatus}
      className="status-badge"
      sx={{
        backgroundColor: backgroundColor,
        color: getTextColor(backgroundColor),
        fontWeight: 500,
        fontSize: '12px',
        height: '24px',
      }}
    />
  );
});
