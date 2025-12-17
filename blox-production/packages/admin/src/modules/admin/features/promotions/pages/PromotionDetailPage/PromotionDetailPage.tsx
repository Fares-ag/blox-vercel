import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Divider, Chip } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Edit, Delete } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading } from '../../../../store/slices/promotions.slice';
import { supabaseApiService } from '@shared/services';
import { Button, StatusBadge, Loading, ConfirmDialog } from '@shared/components';
import { formatDate } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './PromotionDetailPage.scss';

// Dummy data removed - using only localStorage and API

export const PromotionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.promotions);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadPromotionDetails(id);
    }
  }, [id]);

  const loadPromotionDetails = async (promotionId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getPromotionById(promotionId);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Promotion not found');
      }
    } catch (error: any) {
      console.error('❌ Failed to load promotion details:', error);
      toast.error(error.message || 'Failed to load promotion details');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deletePromotion(id);
      
      if (supabaseResponse.status === 'SUCCESS') {
        toast.success('Promotion deleted successfully');
        navigate('/admin/promotions');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete promotion');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete promotion:', error);
      toast.error(error.message || 'Failed to delete promotion');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (loading && !selected) {
    return <Loading fullScreen message="Loading promotion..." />;
  }

  const displayData = selected;

  if (!displayData) {
    return (
      <Box className="promotion-detail-page">
        <Typography variant="h4">Promotion not found</Typography>
        <Button variant="secondary" onClick={() => navigate('/admin/promotions')}>
          Back to Promotions
        </Button>
      </Box>
    );
  }

  const isActive = displayData.status === 'active';
  const isExpired = new Date(displayData.endDate) < new Date();
  const isUpcoming = new Date(displayData.startDate) > new Date();

  return (
    <Box className="promotion-detail-page">
      {/* Header Section */}
      <Box className="page-header">
        <Box className="header-left">
          <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/promotions')} className="back-button">
            Back
          </Button>
          <Box className="header-title-section">
            <Typography variant="h2" className="page-title">
              Promotion Details
            </Typography>
            <Typography variant="body2" className="promotion-id">
              ID: {displayData.id}
            </Typography>
          </Box>
        </Box>
        <Box className="header-actions">
          <StatusBadge status={isActive ? 'Active' : 'Inactive'} type="application" />
          {isExpired && <Chip label="Expired" color="error" sx={{ fontWeight: 600 }} />}
          {isUpcoming && <Chip label="Upcoming" color="warning" sx={{ fontWeight: 600 }} />}
          <Button variant="primary" startIcon={<Edit />} onClick={() => navigate(`/admin/promotions/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="secondary" startIcon={<Delete />} color="error" onClick={() => setDeleteDialogOpen(true)}>
            Delete
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Main Details */}
        <Grid item xs={12} md={8}>
          <Paper className="detail-section">
            <Typography variant="h5" className="section-title">
              Promotion Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Promotion Name
                  </Typography>
                  <Typography variant="h6" className="info-value">
                    {displayData.name}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Description
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.description}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Discount Type
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Discount Value
                  </Typography>
                  <Typography variant="h5" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                    {displayData.discountValue}
                    {displayData.discountType === 'percentage' ? '%' : ' QAR'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Date Information */}
          <Paper className="detail-section" sx={{ mt: 3 }}>
            <Typography variant="h5" className="section-title">
              Validity Period
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Start Date
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {formatDate(displayData.startDate)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    End Date
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {formatDate(displayData.endDate)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Duration
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {Math.ceil((new Date(displayData.endDate).getTime() - new Date(displayData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Metadata */}
        <Grid item xs={12} md={4}>
          <Paper className="detail-section">
            <Typography variant="h5" className="section-title">
              Additional Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <StatusBadge status={isActive ? 'Active' : 'Inactive'} type="application" />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Created At
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {formatDate(displayData.createdAt)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Last Updated
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {formatDate(displayData.updatedAt)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
};

