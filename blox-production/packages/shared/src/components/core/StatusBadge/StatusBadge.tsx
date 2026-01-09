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
  // Lime Yellow needs dark text, others use Light Grey
  const getTextColor = (bgColor: string): string => {
    if (bgColor === 'var(--status-due)' || bgColor === 'var(--status-active)' || bgColor.includes('DAFF01')) {
      return 'var(--blox-black)'; // Blox Black for Lime Yellow backgrounds
    }
    if (bgColor === 'var(--status-paid)' || bgColor === 'var(--status-draft)' || bgColor === 'var(--status-completed)' || 
        bgColor.includes('787663') || bgColor.includes('C9C4B7')) {
      return 'var(--background-secondary)'; // Light Grey for grey backgrounds
    }
    return 'var(--background-secondary)'; // Default to Light Grey
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
