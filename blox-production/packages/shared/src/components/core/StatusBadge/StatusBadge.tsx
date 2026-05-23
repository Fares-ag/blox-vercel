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
  const getTextColor = (bgColor: string): string => {
    // Handle CSS variables
    if (bgColor.startsWith('var(--')) {
      if (bgColor === 'var(--status-due)' || bgColor === 'var(--status-active)') {
        return '#0E1909'; // Blox Black for light backgrounds
      }
      return '#FFFFFF'; // White for dark backgrounds
    }
    
    // Handle hex colors
    if (bgColor.includes('FFC107') || bgColor.includes('FF9800')) {
      // Amber/Yellow and Orange - use black text
      return '#0E1909';
    }
    if (bgColor.includes('2196F3') || bgColor.includes('4CAF50') || bgColor.includes('9C27B0') || 
        bgColor.includes('F44336') || bgColor.includes('757575')) {
      // Blue, Green, Purple, Red, Grey - use white text
      return '#FFFFFF';
    }
    if (bgColor.includes('787663') || bgColor.includes('C9C4B7')) {
      // Grey backgrounds - use white text
      return '#FFFFFF';
    }
    // Default to white text
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
      }}
    />
  );
});
