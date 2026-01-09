import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { ArrowBack, LocalOffer, CreditCard, CheckCircle, Celebration } from '@mui/icons-material';
import { Button } from '@shared/components';
import type { Product } from '@shared/models/product.model';
import type { Promotion } from '@shared/models/promotion.model';
import { formatCurrency } from '@shared/utils/formatters';
import { Loading, EmptyState } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import { InstallmentCalculator } from '../../components/InstallmentCalculator/InstallmentCalculator';
import { vehicleService } from '../../../../services/vehicle.service';
import { toast } from 'react-toastify';
import moment from 'moment';
import './VehicleDetailPage.scss';

// Dummy data removed - using only localStorage and API

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculatorData, setCalculatorData] = useState<any>(null);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    if (id) {
      loadVehicle(id);
    }
    loadActivePromotions();
  }, [id]);

  const loadActivePromotions = async () => {
    try {
      // Load promotions from Supabase only
      const supabaseResponse = await supabaseApiService.getPromotions();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        const now = moment();
        
        // Filter active promotions that are currently valid
        const active = supabaseResponse.data.filter((promo: Promotion) => {
          if (promo.status !== 'active') return false;
          const startDate = moment(promo.startDate);
          const endDate = moment(promo.endDate);
          return now.isBetween(startDate, endDate, 'day', '[]'); // inclusive
        });
        
        setActivePromotions(active);
      }
    } catch (error: any) {
      console.error('❌ Error loading promotions:', error);
    }
  };

  const loadVehicle = async (vehicleId: string) => {
    try {
      setLoading(true);
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getProductById(vehicleId);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Only show if vehicle is active
        if (supabaseResponse.data.status === 'active') {
          setVehicle(supabaseResponse.data);
        } else {
          toast.error('This vehicle is not available');
          navigate('/customer/vehicles');
        }
      } else {
        throw new Error(supabaseResponse.message || 'Vehicle not found');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to load vehicle details');
      if (import.meta.env.DEV) {
        console.error('Failed to load vehicle details:', err);
      }
      toast.error(err.message);
      navigate('/customer/vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyNow = () => {
    if (!calculatorData || calculatorData.downPayment === 0 || calculatorData.termMonths === 0) {
      toast.error('Please fill in the installment details before applying');
      return;
    }
    // Navigate to application creation with pre-filled vehicle and calculator data
    const params = new URLSearchParams({
      vehicleId: vehicle?.id || '',
      ...Object.fromEntries(
        Object.entries(calculatorData).map(([key, value]) => [key, String(value)])
      ),
    });
    navigate(`/customer/applications/new?${params.toString()}`);
  };

  if (loading) {
    return (
      <Box className="vehicle-detail-page">
        <Loading />
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box className="vehicle-detail-page">
        <EmptyState
          title="Vehicle not found"
          message="The vehicle you're looking for doesn't exist or has been removed."
        />
        <Button variant="secondary" onClick={() => navigate('/customer/vehicles')} sx={{ mt: 2 }}>
          Back to Browse
        </Button>
      </Box>
    );
  }

  const imageUrl = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images[0] 
    : '/CarImage.png';

  return (
    <Box className="vehicle-detail-page" sx={{ width: '100%', maxWidth: '100%', margin: 0 }}>
      <Button
        className="back-button"
        variant="secondary"
        startIcon={<ArrowBack />}
        onClick={() => navigate('/customer/vehicles')}
      >
        Back to Browse
      </Button>

      <Box className="detail-content">
        {/* Left Column - Images and Basic Info */}
        <Box className="left-column">
          <Paper className="image-section card">
            <img
              src={imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="main-image"
              loading="lazy"
            />
          </Paper>

          <Paper className="specifications-section card" sx={{ mt: 3 }}>
            <Typography variant="h5" className="section-title">
              Specifications
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'var(--divider-color)' }} />
            <Box className="spec-list">
              <Box className="spec-item">
                <Typography variant="caption">Make</Typography>
                <Typography variant="body1">{vehicle.make}</Typography>
              </Box>
              <Box className="spec-item">
                <Typography variant="caption">Model</Typography>
                <Typography variant="body1">{vehicle.model}</Typography>
              </Box>
              <Box className="spec-item">
                <Typography variant="caption">Trim</Typography>
                <Typography variant="body1">{vehicle.trim}</Typography>
              </Box>
              <Box className="spec-item">
                <Typography variant="caption">Year</Typography>
                <Typography variant="body1">{vehicle.modelYear}</Typography>
              </Box>
              <Box className="spec-item">
                <Typography variant="caption">Engine</Typography>
                <Typography variant="body1">{vehicle.engine}</Typography>
              </Box>
              <Box className="spec-item">
                <Typography variant="caption">Color</Typography>
                <Typography variant="body1">{vehicle.color}</Typography>
              </Box>
              {vehicle.condition === 'old' && (
                <Box className="spec-item">
                  <Typography variant="caption">Mileage</Typography>
                  <Typography variant="body1">
                    {vehicle.mileage?.toLocaleString()} km
                  </Typography>
                </Box>
              )}
              {vehicle.attributes?.map((attr) => (
                <Box className="spec-item" key={attr.id}>
                  <Typography variant="caption">{attr.name}</Typography>
                  <Typography variant="body1">{attr.value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {vehicle.description && (
            <Paper className="description-section card" sx={{ mt: 3 }}>
              <Typography variant="h5" className="section-title">
                Description
              </Typography>
              <Divider sx={{ my: 2, borderColor: 'var(--divider-color)' }} />
              <Typography variant="body1" sx={{ color: 'var(--background-secondary)' }}>{vehicle.description}</Typography>
            </Paper>
          )}
        </Box>

        {/* Right Column - Price and Actions */}
        <Box className="right-column">
          <Paper className="pricing-section card">
            <Box className="price-header">
              <Typography variant="h4" className="price">
                {formatCurrency(vehicle.price)}
              </Typography>
              <Chip
                label={vehicle.condition === 'new' ? 'New Vehicle' : 'Used Vehicle'}
                icon={<CheckCircle />}
                sx={{
                  backgroundColor: vehicle.condition === 'new' ? 'var(--primary-color)' : 'var(--mid-grey)',
                  color: vehicle.condition === 'new' ? 'var(--primary-btn-color)' : 'var(--background-secondary)',
                  fontWeight: 600,
                }}
              />
            </Box>

            <Divider sx={{ my: 2, borderColor: 'var(--divider-color)' }} />

            <Box className="features-box">
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--background-secondary)' }}>
                <LocalOffer sx={{ mr: 1, verticalAlign: 'middle' }} />
                Available Offers
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--background-secondary)', opacity: 0.8 }}>
                Competitive financing options available. Calculate your monthly installments below.
              </Typography>
            </Box>
          </Paper>

          {/* Active Promotions */}
          {activePromotions.length > 0 && (
            <Paper className="promotions-section card" sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Celebration sx={{ mr: 1, color: 'var(--primary-color)' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--background-secondary)' }}>
                  Special Promotions
                </Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: 'var(--divider-color)' }} />
              {activePromotions.map((promo) => (
                <Alert
                  key={promo.id}
                  severity="success"
                  icon={<Celebration />}
                  sx={{
                    mb: 1,
                    backgroundColor: 'rgba(218, 255, 1, 0.1)',
                    color: 'var(--background-secondary)',
                    border: '1px solid rgba(218, 255, 1, 0.2)',
                    '& .MuiAlert-icon': { color: 'var(--primary-color)' },
                    '& .MuiAlert-message': { color: 'var(--background-secondary)' },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'var(--background-secondary)' }}>
                    {promo.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--background-secondary)', opacity: 0.9 }}>
                    {promo.description}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8, color: 'var(--background-secondary)' }}>
                    {promo.discountType === 'percentage' 
                      ? `${promo.discountValue}% off`
                      : `Save ${formatCurrency(promo.discountValue)}`
                    }
                  </Typography>
                </Alert>
              ))}
            </Paper>
          )}

          {/* Installment Calculator */}
          <Paper className="calculator-section card" sx={{ mt: 3 }}>
            <Typography variant="h6" className="section-title">
              Calculate Installments
            </Typography>
            <Divider sx={{ my: 2, borderColor: 'var(--divider-color)' }} />
            <InstallmentCalculator vehiclePrice={vehicle.price} onDataChange={setCalculatorData} />
          </Paper>

          {/* Action Buttons */}
          <Box className="action-buttons" sx={{ mt: 3 }}>
            <Button
              variant="primary"
              fullWidth
              size="large"
              onClick={handleApplyNow}
              startIcon={<CreditCard />}
            >
              Apply Now
            </Button>
            <br />
            <br />
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/customer/vehicles')}
            >
              Browse More Vehicles
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};


