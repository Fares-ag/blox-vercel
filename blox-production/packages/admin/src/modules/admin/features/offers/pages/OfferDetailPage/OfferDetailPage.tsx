import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Divider, Chip } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Edit, Delete, Link as LinkIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading } from '../../../../store/slices/offers.slice';
import { supabaseApiService } from '@shared/services';
import type { InsuranceRate } from '@shared/models/insurance-rate.model';
import { Button, StatusBadge, Loading, ConfirmDialog } from '@shared/components';
import { formatDate } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './OfferDetailPage.scss';

// Dummy data removed - using only localStorage and API

export const OfferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.offers);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insuranceRate, setInsuranceRate] = useState<InsuranceRate | null>(null);

  const loadInsuranceRate = useCallback(async (insuranceRateId: string) => {
    try {
      // Note: We don't have getInsuranceRateById in supabaseApiService yet
      // For now, load all rates and find the one we need
      const supabaseResponse = await supabaseApiService.getInsuranceRates();
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        const rate = supabaseResponse.data.find((ir) => ir.id === insuranceRateId);
        if (rate) {
          setInsuranceRate(rate);
        } else {
          console.warn(`Insurance rate with ID ${insuranceRateId} not found`);
        }
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load insurance rates');
      }
    } catch (error: any) {
      console.error('❌ Failed to load insurance rate:', error);
      toast.error(error.message || 'Failed to load insurance rate information');
    }
  }, []);

  const loadOfferDetails = useCallback(async (offerId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getOfferById(offerId);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load offer from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load offer details:', error);
      toast.error(error.message || 'Failed to load offer from Supabase');
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      loadOfferDetails(id);
    }
  }, [id, loadOfferDetails]);

  useEffect(() => {
    // Load insurance rate if offer has insuranceRateId
    const data = selected;
    if (data?.insuranceRateId && !data?.insuranceRate) {
      loadInsuranceRate(data.insuranceRateId);
    } else if (data?.insuranceRate) {
      setInsuranceRate(data.insuranceRate);
    }
  }, [selected?.insuranceRateId, selected?.insuranceRate, loadInsuranceRate]);

  const handleDelete = useCallback(async () => {
    if (!id) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deleteOffer(id);
      
      if (supabaseResponse.status === 'SUCCESS') {
        toast.success('Offer deleted successfully');
        navigate('/admin/offers');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete offer');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete offer:', error);
      toast.error(error.message || 'Failed to delete offer from Supabase');
    } finally {
      setDeleteDialogOpen(false);
    }
  }, [id, navigate]);

  if (loading && !selected) {
    return <Loading fullScreen message="Loading offer..." />;
  }

  const displayData = selected;

  if (!displayData) {
    return (
      <Box className="offer-detail-page">
        <Typography variant="h4">Offer not found</Typography>
        <Button variant="secondary" onClick={() => navigate('/admin/offers')}>
          Back to Offers
        </Button>
      </Box>
    );
  }

  return (
    <Box className="offer-detail-page">
      {/* Header Section */}
      <Box className="page-header">
        <Box className="header-left">
          <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/offers')} className="back-button">
            Back
          </Button>
          <Box className="header-title-section">
            <Typography variant="h2" className="page-title">
              Offer Details
            </Typography>
            <Typography variant="body2" className="offer-id">
              ID: {displayData.id}
            </Typography>
          </Box>
        </Box>
        <Box className="header-actions">
          <StatusBadge status={displayData.status === 'active' ? 'Active' : 'Inactive'} type="application" />
          {displayData.isDefault && (
            <Chip label="Default Offer" color="primary" sx={{ fontWeight: 600 }} />
          )}
          <Button variant="primary" startIcon={<Edit />} onClick={() => navigate(`/admin/offers/${id}/edit`)}>
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
              Offer Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Offer Name
                  </Typography>
                  <Typography variant="h6" className="info-value">
                    {displayData.name}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <StatusBadge status={displayData.status === 'active' ? 'Active' : 'Inactive'} type="application" />
                  </Box>
                </Box>
              </Grid>
              {displayData.isDefault && (
                <Grid item xs={12}>
                  <Chip label="This is the default offer" color="primary" sx={{ fontWeight: 600 }} />
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Rental Rates */}
          <Paper className="detail-section" sx={{ mt: 3 }}>
            <Typography variant="h5" className="section-title">
              Rental Rates
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Annual Rent Rate
                  </Typography>
                  <Typography variant="h5" className="info-value" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                    {displayData.annualRentRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Rate applied to customers
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Annual Rent Rate (Funder)
                  </Typography>
                  <Typography variant="h5" className="info-value" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                    {displayData.annualRentRateFunder}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Rate for funder calculation
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Insurance Rates */}
          <Paper className="detail-section" sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" className="section-title">
                Insurance Rate
              </Typography>
              {insuranceRate && (
                <Button
                  variant="small"
                  startIcon={<LinkIcon />}
                  onClick={() => navigate(`/admin/insurance-rates/${insuranceRate.id}`)}
                >
                  View Details
                </Button>
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            {insuranceRate ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Insurance Product
                    </Typography>
                    <Typography variant="h6" className="info-value">
                      {insuranceRate.name}
                    </Typography>
                    {insuranceRate.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {insuranceRate.description}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Coverage Type
                    </Typography>
                    <Typography variant="body1" className="info-value" sx={{ textTransform: 'capitalize' }}>
                      {insuranceRate.coverageType}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Annual Insurance Rate
                    </Typography>
                    <Typography variant="h5" className="info-value" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                      {insuranceRate.annualRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Rate applied to customers
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Annual Insurance Rate (Provider)
                    </Typography>
                    <Typography variant="h5" className="info-value" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                      {insuranceRate.providerRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Rate for insurance provider
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : displayData.annualInsuranceRate ? (
              // Fallback to legacy fields if no insurance rate reference
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, backgroundColor: '#fff3cd', borderRadius: 2, border: '1px solid #ffc107' }}>
                    <Typography variant="body2" color="warning.main">
                      This offer uses legacy insurance rate fields. Consider updating it to use an Insurance Rate product reference.
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Annual Insurance Rate
                    </Typography>
                    <Typography variant="h5" className="info-value" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                      {displayData.annualInsuranceRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Rate applied to customers
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Annual Insurance Rate (Provider)
                    </Typography>
                    <Typography variant="h5" className="info-value" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                      {displayData.annualInsuranceRateProvider}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Rate for insurance provider
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ p: 2, backgroundColor: '#ffebee', borderRadius: 2, border: '1px solid #f44336' }}>
                <Typography variant="body2" color="error.main">
                  No insurance rate assigned to this offer. Please edit the offer to assign an insurance rate.
                </Typography>
              </Box>
            )}
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
                    Admin Offer
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {displayData.isAdmin ? 'Yes' : 'No'}
                  </Typography>
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
        title="Delete Offer"
        message="Are you sure you want to delete this offer? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
};

