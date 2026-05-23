import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Edit, Delete } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, removePackage } from '../../../../store/slices/packages.slice';
import { supabaseApiService } from '@shared/services';
import { Button, StatusBadge, Loading, ConfirmDialog } from '@shared/components';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './PackageDetailPage.scss';

// Dummy data removed - using only localStorage and API

export const PackageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.packages);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadPackageDetails = useCallback(async (packageId: string) => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getPackageById(packageId);

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load package');
      }
    } catch (error: any) {
      console.error('❌ Failed to load package details:', error);
      toast.error(error.message || 'Failed to load package');
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      loadPackageDetails(id);
    }
  }, [id, loadPackageDetails]);

  const handleDelete = useCallback(async () => {
    if (!id) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deletePackage(id);
      
      if (supabaseResponse.status === 'SUCCESS') {
        dispatch(removePackage(id));
        toast.success('Package deleted successfully');
        navigate('/admin/packages');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete package');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete package:', error);
      toast.error(error.message || 'Failed to delete package');
    } finally {
      setDeleteDialogOpen(false);
    }
  }, [id, dispatch, navigate]);

  if (loading && !selected) {
    return <Loading fullScreen message="Loading package..." />;
  }

  if (!selected) {
    return (
      <Box className="package-detail-page">
        <Box className="page-header">
          <Button
            variant="text"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/admin/packages')}
            className="back-button"
          >
            Back to Packages
          </Button>
        </Box>
        <Paper className="detail-section">
          <Typography variant="h6" color="error">
            Package not found
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="package-detail-page">
      <Box className="page-header">
        <Box className="header-left">
          <Button
            variant="text"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/admin/packages')}
            className="back-button"
          >
            Back
          </Button>
          <Box className="header-title-section">
            <Typography variant="h2" className="page-title">
              {selected.name}
            </Typography>
            <Typography variant="body2" className="package-id">
              ID: {selected.id}
            </Typography>
          </Box>
        </Box>
        <Box className="header-actions">
          <StatusBadge status={selected.status} />
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/admin/packages/${selected.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="detail-section">
            <Typography variant="h6" className="section-title">
              Package Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography className="info-label">Name</Typography>
                  <Typography className="info-value">{selected.name}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography className="info-label">Price</Typography>
                  <Typography className="info-value">{formatCurrency(selected.price)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box className="info-item">
                  <Typography className="info-label">Description</Typography>
                  <Typography className="info-value">{selected.description}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography className="info-label">Status</Typography>
                  <StatusBadge status={selected.status} />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="info-item">
                  <Typography className="info-label">Number of Items</Typography>
                  <Typography className="info-value">{selected.items?.length || 0}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Paper className="detail-section" sx={{ mt: 3 }}>
            <Typography variant="h6" className="section-title">
              Package Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {selected.items && selected.items.length > 0 ? (
              <List>
                {selected.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem>
                      <ListItemText
                        primary={item.name}
                        secondary={item.description}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </ListItem>
                    {index < selected.items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No items in this package
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="detail-section">
            <Typography variant="h6" className="section-title">
              Additional Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box className="info-item" sx={{ mb: 3 }}>
              <Typography className="info-label">Created At</Typography>
              <Typography className="info-value">
                {formatDate(selected.createdAt)}
              </Typography>
            </Box>
            
            <Box className="info-item">
              <Typography className="info-label">Last Updated</Typography>
              <Typography className="info-value">
                {formatDate(selected.updatedAt)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Package"
        message={`Are you sure you want to delete "${selected.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Box>
  );
};

