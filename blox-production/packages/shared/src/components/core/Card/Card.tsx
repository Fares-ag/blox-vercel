import React from 'react';
import { Card as MuiCard, CardContent } from '@mui/material';
import './Card.scss';

export interface CardPropsCustom extends React.ComponentProps<typeof MuiCard> {
  icon?: React.ReactNode;
  title?: string;
  value?: string | number;
  subtitle?: string;
  onClick?: () => void;
  moduleType?: 'currency' | 'number' | 'percentage';
}

export const Card: React.FC<CardPropsCustom> = ({
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
    
    if (moduleType === 'currency') {
      return `QAR ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (moduleType === 'percentage') {
      return `${value}%`;
    }
    return value.toString();
  };

  return (
    <MuiCard
      className={`custom-card ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
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
};
