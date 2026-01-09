import React, { useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, FileDownload } from '@mui/icons-material';
import type { Application } from '@shared/models/application.model';
import { StatusBadge, Loading, EmptyState } from '@shared/components';
import { formatDateTime, formatCurrency } from '@shared/utils/formatters';
import { supabaseApiService } from '@shared/services';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setApplications, setLoading, setError } from '../../../../store/slices/application.slice';
import { toast } from 'react-toastify';
import './ApplicationsListPage.scss';

// Dummy data removed - using only localStorage and API

export const ApplicationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((state) => state.application);
  const { user } = useAppSelector((state) => state.auth);

  const loadApplications = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Filter to current user's applications by email
        const userEmail = user?.email;
        const userApplications = userEmail 
          ? supabaseResponse.data.filter((app) => app.customerEmail?.toLowerCase() === userEmail.toLowerCase())
          : [];
        
        dispatch(setApplications(userApplications));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load applications');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to load applications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load applications';
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
      dispatch(setApplications([]));
    } finally {
      dispatch(setLoading(false));
    }
  }, [user?.email, dispatch]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleViewDetails = (applicationId: string) => {
    navigate(`/customer/my-applications/${applicationId}`);
  };

  if (loading) {
    return (
      <Box className="applications-list-page">
        <Loading />
      </Box>
    );
  }

  return (
    <Box className="applications-list-page">
      <Typography variant="h4" className="page-title">
        My Applications
      </Typography>
      <Typography variant="body2" color="text.secondary" className="page-subtitle">
        View and manage your vehicle financing applications
      </Typography>

      {list.length === 0 ? (
        <EmptyState
          title="No applications found"
          message="You haven't submitted any applications yet. Browse vehicles to get started."
          onAction={() => navigate('/customer/vehicles')}
          actionLabel="Browse Vehicles"
        />
      ) : (
        <Box className="applications-grid">
          {list.map((application) => (
            <Card key={application.id} className="application-card">
              <CardContent>
                <Box className="card-header">
                  <Box>
                    <Typography variant="h6" className="application-id">
                      Application #{application.id}
                    </Typography>
                    <Typography variant="body2" className="vehicle-info" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                      {application.vehicle
                        ? `${application.vehicle.make} ${application.vehicle.model} ${application.vehicle.trim}`
                        : 'Vehicle Information'}
                    </Typography>
                  </Box>
                  <StatusBadge status={application.status} />
                </Box>

                <Box className="card-details">
                  <Box className="detail-row">
                    <Typography variant="caption" className="detail-label" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                      Vehicle Price
                    </Typography>
                    <Typography variant="body2" className="detail-value" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                      {application.vehicle
                        ? formatCurrency(application.vehicle.price)
                        : 'N/A'}
                    </Typography>
                  </Box>
                  <Box className="detail-row">
                    <Typography variant="caption" className="detail-label" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                      Down Payment
                    </Typography>
                    <Typography variant="body2" className="detail-value" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                      {formatCurrency(application.downPayment)}
                    </Typography>
                  </Box>
                  <Box className="detail-row">
                    <Typography variant="caption" className="detail-label" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                      Loan Amount
                    </Typography>
                    <Typography variant="body2" className="detail-value" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                      {formatCurrency(application.loanAmount)}
                    </Typography>
                  </Box>
                  <Box className="detail-row">
                    <Typography variant="caption" className="detail-label" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                      Created
                    </Typography>
                    <Typography variant="body2" className="detail-value" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                      {application.createdAt ? formatDateTime(application.createdAt) : 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Box className="card-actions">
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => handleViewDetails(application.id)}
                    className="view-button"
                  >
                    View Details
                  </Button>
                  {application.contractGenerated && (
                    <Button
                      variant="outlined"
                      startIcon={<FileDownload />}
                      className="download-button"
                    >
                      Download Contract
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};
