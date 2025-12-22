import React from 'react';
import { Card as MuiCard, CardContent } from '@mui/material';
import { formatCurrency } from '@shared/utils/formatters';
import './Card.scss';

export interface CardPropsCustom extends React.ComponentProps<typeof MuiCard> {
  icon?: React.ReactNode;
  title?: string;
  value?: string | number;
  subtitle?: string;
  onClick?: () => void;
  moduleType?: 'currency' | 'number' | 'percentage';
}

export const Card: React.FC<CardPropsCustom> = React.memo(({
  icon,
  title,
  value,
  subtitle,
  onClick,
  moduleType = 'number',
  className = '',
  children,
  ...props
}) => {
  const formatValue = () => {
    if (value === undefined || value === null) return '';
    
    // Handle NaN values
    const numValue = Number(value);
    if (isNaN(numValue)) return '0';
    
    if (moduleType === 'currency') {
      // Use formatCurrency for consistency with CurrencyConfig
      return formatCurrency(numValue);
    } else if (moduleType === 'percentage') {
      return `${numValue}%`;
    }
    // Format regular numbers with commas for thousands
    return numValue.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  return (
    <MuiCard
      className={`custom-card ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={title ? `${title}: ${value !== undefined ? formatValue() : ''}` : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      {...props}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {icon && <div className="card-icon">{icon}</div>}
        {title && <div className="card-title">{title}</div>}
        {value !== undefined && value !== null && (
          <div className="card-value">{formatValue()}</div>
        )}
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
        {children}
      </CardContent>
    </MuiCard>
  );
}, (prevProps, nextProps) => {
  // Memo comparison: only re-render if value, title, or onClick changes
  return prevProps.value === nextProps.value &&
         prevProps.title === nextProps.title &&
         prevProps.onClick === nextProps.onClick &&
         prevProps.moduleType === nextProps.moduleType;
});
