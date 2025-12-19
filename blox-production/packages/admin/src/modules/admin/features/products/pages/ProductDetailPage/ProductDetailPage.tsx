import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, removeProduct } from '../../../../store/slices/products.slice';
import { supabaseApiService } from '@shared/services';
import { Button, StatusBadge, Loading, ConfirmDialog } from '@shared/components';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './ProductDetailPage.scss';

// Dummy data for testing
// Dummy data removed - using only localStorage and API

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.products);
  const [isActive, setIsActive] = React.useState(selected?.status === 'active');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadProductDetails = useCallback(async (productId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getProductById(productId);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Product not found');
      }
    } catch (error: any) {
      console.error('❌ Failed to load vehicle details:', error);
      toast.error(error.message || 'Failed to load vehicle details');
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      loadProductDetails(id);
    }
  }, [id, loadProductDetails]);

  useEffect(() => {
    if (selected) {
      setIsActive(selected.status === 'active');
    }
  }, [selected?.status]);

  const handleStatusToggle = useCallback(async () => {
    if (!id || !selected) return;

    try {
      const newStatus = !isActive ? 'active' : 'inactive';
      
      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updateProduct(id, {
        status: newStatus,
      });

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        setIsActive(!isActive);
        dispatch(setSelected(supabaseResponse.data));
        toast.success(`Vehicle ${!isActive ? 'activated' : 'deactivated'} successfully`);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to update vehicle status');
      }
    } catch (error: any) {
      console.error('❌ Failed to update vehicle status:', error);
      toast.error(error.message || 'Failed to update vehicle status');
    }
  }, [id, selected, isActive, dispatch]);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!id) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deleteProduct(id);

      if (supabaseResponse.status === 'SUCCESS') {
        // Remove from Redux
        dispatch(removeProduct(id));
        toast.success('Vehicle deleted successfully');
        navigate('/admin/products');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete vehicle');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete vehicle:', error);
      toast.error(error.message || 'Failed to delete vehicle');
    } finally {
      setDeleteDialogOpen(false);
    }
  }, [id, dispatch, navigate]);

  if (loading) {
    return <Loading fullScreen message="Loading vehicle details..." />;
  }

  // Use only selected data - no dummy data
  const displayData = selected;

  if (!displayData) {
    return (
      <Box className="product-detail-page">
        <Typography variant="h4">Vehicle not found</Typography>
        <Button variant="secondary" onClick={() => navigate('/admin/products')}>
          Back to List
        </Button>
      </Box>
    );
  }

  return (
    <Box className="product-detail-page">
      <Box className="page-header">
        <Button variant="secondary" onClick={() => navigate('/admin/products')}>
          Back to List
        </Button>
        <Typography variant="h2">Vehicle Details</Typography>
        <Box className="header-actions">
          <FormControlLabel
            control={<Switch checked={isActive} onChange={handleStatusToggle} />}
            label={isActive ? 'Active' : 'Inactive'}
          />
          <Button variant="primary" onClick={() => navigate(`/admin/products/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={handleDelete}>
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="detail-section">
            <Typography variant="h3" className="section-title">
              Basic Information
            </Typography>
            <Grid container spacing={2} className="info-grid">
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Make
                </Typography>
                <Typography variant="body1">{displayData.make}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Model
                </Typography>
                <Typography variant="body1">{displayData.model}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Trim
                </Typography>
                <Typography variant="body1">{displayData.trim}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Model Year
                </Typography>
                <Typography variant="body1">{displayData.modelYear}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Condition
                </Typography>
                <Typography variant="body1" className="capitalize">
                  {displayData.condition}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Status
                </Typography>
                <StatusBadge status={displayData.status === 'active' ? 'Active' : 'Inactive'} type="application" />
              </Grid>
            </Grid>
          </Paper>

          <Paper className="detail-section">
            <Typography variant="h3" className="section-title">
              Specifications
            </Typography>
            <Grid container spacing={2} className="info-grid">
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Engine
                </Typography>
                <Typography variant="body1">{displayData.engine}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Color
                </Typography>
                <Typography variant="body1">{displayData.color}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Mileage
                </Typography>
                <Typography variant="body1">{displayData.mileage.toLocaleString()} km</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" className="info-label">
                  Price
                </Typography>
                <Typography variant="body1" className="price">
                  {formatCurrency(displayData.price)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper className="detail-section">
            <Typography variant="h3" className="section-title">
              Images
            </Typography>
            {displayData.images && displayData.images.length > 0 ? (
              <Grid container spacing={2}>
                {displayData.images.map((image, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box
                      className="product-image-wrapper"
                      onClick={() => window.open(image, '_blank')}
                    >
                      <img 
                        src={image} 
                        alt={`Vehicle image ${index + 1}`}
                        className="product-image"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="body2">No images available for this vehicle</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="detail-section">
            <Typography variant="h3" className="section-title">
              Additional Information
            </Typography>
            <Box className="info-item">
              <Typography variant="body2" className="info-label">
                Created At
              </Typography>
              <Typography variant="body1">{formatDate(displayData.createdAt)}</Typography>
            </Box>
            <Box className="info-item">
              <Typography variant="body2" className="info-label">
                Updated At
              </Typography>
              <Typography variant="body1">{formatDate(displayData.updatedAt)}</Typography>
            </Box>
            {displayData.description && (
              <Box className="info-item">
                <Typography variant="body2" className="info-label">
                  Description
                </Typography>
                <Typography variant="body1">{displayData.description}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
};
