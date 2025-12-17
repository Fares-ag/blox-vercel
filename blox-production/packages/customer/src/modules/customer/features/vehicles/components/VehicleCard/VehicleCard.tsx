import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardMedia, Typography, Box, Chip } from '@mui/material';
import type { Product } from '@shared/models/product.model';
import { formatCurrency } from '@shared/utils/formatters';
import './VehicleCard.scss';

interface VehicleCardProps {
  vehicle: Product;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/customer/vehicles/${vehicle.id}`);
  };

  const imageUrl = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images[0] 
    : '/CarImage.png';

  return (
    <Card className="vehicle-card" onClick={handleCardClick}>
      <CardMedia
        component="img"
        height="200"
        image={imageUrl}
        alt={`${vehicle.make} ${vehicle.model}`}
        className="vehicle-image"
      />
      <CardContent>
        <Box className="vehicle-header">
          <Box>
            <Typography variant="h6" className="vehicle-title">
              {vehicle.make} {vehicle.model}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="vehicle-trim">
              {vehicle.trim} • {vehicle.modelYear}
            </Typography>
          </Box>
          <Chip
            label={vehicle.condition === 'new' ? 'New' : 'Used'}
            size="small"
            color={vehicle.condition === 'new' ? 'primary' : 'default'}
            className="condition-chip"
          />
        </Box>

        <Box className="vehicle-details">
          <Box className="detail-item">
            <Typography variant="caption" color="text.secondary">
              Engine
            </Typography>
            <Typography variant="body2">{vehicle.engine}</Typography>
          </Box>
          <Box className="detail-item">
            <Typography variant="caption" color="text.secondary">
              Color
            </Typography>
            <Typography variant="body2">{vehicle.color}</Typography>
          </Box>
          {vehicle.condition === 'old' && (
            <Box className="detail-item">
              <Typography variant="caption" color="text.secondary">
                Mileage
              </Typography>
              <Typography variant="body2">{vehicle.mileage?.toLocaleString()} km</Typography>
            </Box>
          )}
        </Box>

        <Box className="vehicle-price">
          <Typography variant="h5" className="price">
            {formatCurrency(vehicle.price)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Starting from
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

