import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Divider, Chip, Alert } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Edit, Delete } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, removeInsuranceRate } from '../../../../store/slices/insurance-rates.slice';
import { supabaseApiService } from '@shared/services';
import { Button, StatusBadge, Loading, ConfirmDialog } from '@shared/components';
import { formatDate } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './InsuranceRateDetailPage.scss';

// Dummy data removed - using only localStorage and API

export const InsuranceRateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.insuranceRates);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadInsuranceRateDetails(id);
    }
  }, [id]);

  const loadInsuranceRateDetails = async (rateId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getInsuranceRateById(rateId);

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load insurance rate');
      }
    } catch (error: any) {
      console.error('❌ Failed to load insurance rate details:', error);
      toast.error(error.message || 'Failed to load insurance rate');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!id) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deleteInsuranceRate(id);
      
      if (supabaseResponse.status === 'SUCCESS') {
        dispatch(removeInsuranceRate(id));
        toast.success('Insurance rate deleted successfully');
        navigate('/admin/insurance-rates');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete insurance rate');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete insurance rate:', error);
      toast.error(error.message || 'Failed to delete insurance rate');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  const insuranceRate = selected;

  if (!insuranceRate) {
    return (
      <Box className="insurance-rate-detail-page">
        <Alert severity="error">Insurance rate not found</Alert>
        <Button variant="outlined" onClick={() => navigate('/admin/insurance-rates')} sx={{ mt: 2 }}>
          Back to Insurance Rates
        </Button>
      </Box>
    );
  }

  return (
    <Box className="insurance-rate-detail-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/insurance-rates')}
        className="back-button"
      >
        Back to Insurance Rates
      </Button>

      <Box className="page-header">
        <Box>
          <Typography variant="h4" className="page-title">
            {insuranceRate.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="page-subtitle">
            Created on {formatDate(insuranceRate.createdAt)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <StatusBadge status={insuranceRate.status === 'active' ? 'Active' : 'Inactive'} type="application" />
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/admin/insurance-rates/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="detail-section">
            <Typography variant="h6" className="section-title">
              Insurance Rate Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Name
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {insuranceRate.name}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Coverage Type
                  </Typography>
                  <Typography variant="body1" className="info-value">
                    {insuranceRate.coverageType.charAt(0).toUpperCase() + insuranceRate.coverageType.slice(1)}
                  </Typography>
                </Box>
              </Grid>
              {insuranceRate.description && (
                <Grid item xs={12}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Description
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {insuranceRate.description}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Annual Rate (%)
                  </Typography>
                  <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                    {insuranceRate.annualRate}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography variant="caption" className="info-label">
                    Provider Rate (%)
                  </Typography>
                  <Typography variant="body1" className="info-value" sx={{ color: '#00CFA2', fontWeight: 600 }}>
                    {insuranceRate.providerRate}%
                  </Typography>
                </Box>
              </Grid>
              {insuranceRate.minVehicleValue !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Minimum Vehicle Value
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {insuranceRate.minVehicleValue ? `QAR ${insuranceRate.minVehicleValue.toLocaleString()}` : 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {insuranceRate.maxVehicleValue !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Maximum Vehicle Value
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {insuranceRate.maxVehicleValue ? `QAR ${insuranceRate.maxVehicleValue.toLocaleString()}` : 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {insuranceRate.minTenure !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Minimum Tenure (months)
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {insuranceRate.minTenure || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {insuranceRate.maxTenure !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Box className="info-item">
                    <Typography variant="caption" className="info-label">
                      Maximum Tenure (months)
                    </Typography>
                    <Typography variant="body1" className="info-value">
                      {insuranceRate.maxTenure || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="detail-section">
            <Typography variant="h6" className="section-title">
              Status & Settings
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box className="info-item">
              <Typography variant="caption" className="info-label">
                Status
              </Typography>
              <Box sx={{ mt: 1 }}>
                <StatusBadge status={insuranceRate.status === 'active' ? 'Active' : 'Inactive'} type="application" />
              </Box>
            </Box>
            <Box className="info-item">
              <Typography variant="caption" className="info-label">
                Default Rate
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={insuranceRate.isDefault ? 'Yes' : 'No'}
                  color={insuranceRate.isDefault ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box className="info-item">
              <Typography variant="caption" className="info-label">
                Created At
              </Typography>
              <Typography variant="body2" className="info-value">
                {formatDate(insuranceRate.createdAt)}
              </Typography>
            </Box>
            <Box className="info-item">
              <Typography variant="caption" className="info-label">
                Last Updated
              </Typography>
              <Typography variant="body2" className="info-value">
                {formatDate(insuranceRate.updatedAt)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Insurance Rate"
        message="Are you sure you want to delete this insurance rate? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
};

