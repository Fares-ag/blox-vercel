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
  'var(--status-under-review)',
]);

const isLimeFill = (bgColor: string): boolean => {
  if (LIME_STATUS_VARS.has(bgColor)) return true;
  const normalized = bgColor.toLowerCase();
  return (
    normalized.includes('dbff00') ||
    normalized.includes('c4e600') ||
    normalized.includes('e8ff66')
  );
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

  const statusLabels: Record<string, string> = {
    pending_finance_activation: 'Approved — awaiting finance activation',
  };
  const formattedStatus =
    statusLabels[status.toLowerCase()] ||
    status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const backgroundColor = getColor();
  const limeFill = isLimeFill(backgroundColor);

  const getTextColor = (): string => {
    if (limeFill) {
      return 'var(--blox-black)';
    }
    // Deep green / slate / emerald fills → white; lime handled above
    return '#FFFFFF';
  };

  return (
    <Chip
      label={formattedStatus}
      className="status-badge"
      sx={{
        backgroundColor: backgroundColor,
        color: getTextColor(),
        fontWeight: 600,
        fontSize: '13px',
        height: '26px',
        px: 1,
        // Lime chips dissolve into #F2F6F6 without an edge
        border: limeFill ? '1px solid var(--blox-black)' : '1px solid transparent',
      }}
    />
  );
});
