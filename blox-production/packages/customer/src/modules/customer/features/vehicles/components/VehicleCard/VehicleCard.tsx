import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardMedia, Typography, Box, Button, Divider } from '@mui/material';
import type { Product } from '@shared/models/product.model';
import { formatCurrency } from '@shared/utils/formatters';
import { formatProductDisplayTitle } from '@shared/utils';
import { getVehicleDisplayImage } from '../../utils/vehicle-image.utils';
import './VehicleCard.scss';

interface VehicleCardProps {
  vehicle: Product;
}

// Mock available colors - in real app, this would come from vehicle data
// For now, we'll show a few color options. In production, this would come from vehicle.colorOptions array
const getAvailableColors = (vehicle: Product): string[] => {
  // Map vehicle color to available color options
  // In production, this would come from vehicle.colorOptions or similar field
  const colorMap: Record<string, string[]> = {
    'black': ['#16535B', '#708090', '#A8B2BC'], // Blox Black, Dark Grey, Mid Grey
    'silver': ['#A8B2BC', '#F2F6F6', '#708090'], // Mid Grey, Light Grey, Dark Grey
    'white': ['#F2F6F6', '#A8B2BC', '#708090'], // Light Grey, Mid Grey, Dark Grey
  };
  
  const vehicleColor = vehicle.color?.toLowerCase() || 'silver';
  return colorMap[vehicleColor] || ['#16535B', '#708090', '#A8B2BC']; // Default to brand colors
};

export const VehicleCard: React.FC<VehicleCardProps> = React.memo(({ vehicle }) => {
  const navigate = useNavigate();

  const handleSendRequest = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/customer/vehicles/${vehicle.id}`);
  }, [navigate, vehicle.id]);

  const handleCardClick = useCallback(() => {
    navigate(`/customer/vehicles/${vehicle.id}`);
  }, [navigate, vehicle.id]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  const imageUrl = getVehicleDisplayImage(vehicle);

  const availableColors = getAvailableColors(vehicle);
  // Always show at least 3 colors, with count if more available
  const totalColors = 6; // Mock: assume 6 total colors available
  const displayColors = availableColors.slice(0, 3);
  const additionalColorsCount = totalColors > 3 ? totalColors - 3 : 0;
  
  // Fallback description if none provided
  const description = vehicle.description || 
    `A comfortable car with great mileage${vehicle.condition === 'old' && vehicle.mileage ? ` • ${vehicle.mileage?.toLocaleString()} km` : ''}`;

  return (
    <Card 
      className="vehicle-card" 
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${formatProductDisplayTitle(vehicle)}`}
    >
      <Box className="vehicle-image-wrapper">
        {/* Color Indicators */}
        <Box className="color-indicators">
          {displayColors.map((color, index) => (
            <Box
              key={index}
              className="color-dot"
              sx={{ backgroundColor: color }}
              title={`Available in ${color}`}
            />
          ))}
          {additionalColorsCount > 0 && (
            <Typography variant="caption" className="color-count">
              +{additionalColorsCount}
            </Typography>
          )}
        </Box>
        <CardMedia
          component="img"
          image={imageUrl}
          alt={formatProductDisplayTitle(vehicle)}
          className="vehicle-image"
          loading="lazy"
        />
      </Box>
      <CardContent>
        {/* Brand Name */}
        <Typography variant="caption" className="vehicle-brand">
          {vehicle.make}
        </Typography>

        {/* Model + trim variant */}
        <Typography variant="h6" className="vehicle-model">
          {[vehicle.model, vehicle.trim].filter(Boolean).join(' ')}
        </Typography>

        {/* Description */}
        <Typography variant="body2" className="vehicle-description">
          {description}
        </Typography>

        {/* Divider */}
        <Divider className="vehicle-divider" />

        {/* Price */}
        <Typography variant="h6" className="vehicle-price">
          {formatCurrency(vehicle.price)}
        </Typography>

        {/* Send Request Button */}
        <Button
          variant="contained"
          fullWidth
          className="send-request-button"
          onClick={handleSendRequest}
          sx={{
            backgroundColor: 'var(--primary-color)',
            color: 'var(--primary-btn-color)',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '10px 20px',
            minHeight: '44px',
            fontSize: '14px',
            '&:hover': {
              backgroundColor: 'var(--primary-btn-hover)',
            },
            '&:focus-visible': {
              outline: '2px solid var(--focus-ring-primary)',
              outlineOffset: '2px',
            },
          }}
        >
          Send Request
        </Button>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return prevProps.vehicle.id === nextProps.vehicle.id &&
         prevProps.vehicle.price === nextProps.vehicle.price &&
         prevProps.vehicle.status === nextProps.vehicle.status;
});

