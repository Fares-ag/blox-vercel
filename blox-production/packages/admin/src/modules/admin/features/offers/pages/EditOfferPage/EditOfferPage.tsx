import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, updateOffer } from '../../../../store/slices/offers.slice';
import { supabaseApiService } from '@shared/services';
import type { Offer } from '@shared/models/offer.model';
import type { InsuranceRate } from '@shared/models/insurance-rate.model';
import { Button, Input, Loading, Select, type SelectOption } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import './EditOfferPage.scss';

// Using only Supabase - no API or localStorage fallbacks

export const EditOfferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.offers);
  const [saving, setSaving] = useState(false);
  const [insuranceRates, setInsuranceRates] = useState<InsuranceRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Offer>({
    defaultValues: selected || {},
  });

  const loadInsuranceRates = useCallback(async () => {
    try {
      setLoadingRates(true);
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getInsuranceRates();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        const activeRates = supabaseResponse.data.filter((ir) => ir.status === 'active');
        setInsuranceRates(activeRates);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load insurance rates from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load insurance rates:', error);
      toast.error(error.message || 'Failed to load insurance rates from Supabase');
    } finally {
      setLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    loadInsuranceRates();
  }, [loadInsuranceRates]);

  const insuranceRateOptions: SelectOption[] = insuranceRates.map((ir) => ({
    value: ir.id,
    label: `${ir.name} (${ir.annualRate}%)`,
  }));

  const selectedInsuranceRate = insuranceRates.find((ir) => ir.id === watch('insuranceRateId'));

  const loadOffer = useCallback(async () => {
    if (!id) return;

    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getOfferById(id);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load offer from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load offer:', error);
      toast.error(error.message || 'Failed to load offer from Supabase');
      navigate('/admin/offers');
    } finally {
      dispatch(setLoading(false));
    }
  }, [id, dispatch, navigate]);

  useEffect(() => {
    if (id && (!selected || selected.id !== id)) {
      loadOffer();
    } else if (selected && selected.id === id) {
      Object.keys(selected).forEach((key) => {
        setValue(key as keyof Offer, selected[key as keyof Offer] as any);
      });
      if (selected.insuranceRateId) {
        setValue('insuranceRateId', selected.insuranceRateId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selected?.id, loadOffer]);

  const onSubmit = useCallback(async (data: any) => {
    if (!id) return;

    try {
      setSaving(true);
      // Only send insuranceRateId, not the full object
      const payload = {
        ...data,
        insuranceRateId: data.insuranceRateId || undefined,
      };
      // Remove legacy fields if insuranceRateId is provided
      if (payload.insuranceRateId) {
        delete payload.annualInsuranceRate;
        delete payload.annualInsuranceRateProvider;
      }

      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updateOffer(id, payload);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updateOffer(supabaseResponse.data));
        toast.success('Offer updated successfully!');
        navigate(`/admin/offers`);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to update offer');
      }
    } catch (error: any) {
      console.error('❌ Failed to update offer:', error);
      toast.error(error.message || 'Failed to update offer in Supabase');
    } finally {
      setSaving(false);
    }
  }, [id, dispatch, navigate]);

  if (loading && !selected) {
    return <Loading fullScreen message="Loading offer..." />;
  }

  return (
    <Box className="edit-offer-page">
      <Box className="page-header">
        <Button variant="secondary" onClick={() => navigate('/admin/offers')}>
          Cancel
        </Button>
        <Typography variant="h2">Edit Offer</Typography>
      </Box>

      <Paper className="form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Input
                label="Offer Name"
                {...register('name', { required: 'Offer name is required' })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Rent Rate (%)"
                type="number"
                {...register('annualRentRate', { 
                  required: 'Annual rent rate is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Rate cannot be negative' }
                })}
                error={!!errors.annualRentRate}
                helperText={errors.annualRentRate?.message || 'Enter 0 for interest-free offers'}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Rent Rate for Funder (%)"
                type="number"
                {...register('annualRentRateFunder', { valueAsNumber: true })}
                error={!!errors.annualRentRateFunder}
                inputProps={{ step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Select
                label="Insurance Rate"
                value={watch('insuranceRateId') || ''}
                onChange={(e) => setValue('insuranceRateId', String(e.target.value))}
                options={insuranceRateOptions}
                disabled={loadingRates}
                error={!!errors.insuranceRateId}
                helperText={errors.insuranceRateId?.message || 'Select an insurance rate product from the Insurance & Rates catalog'}
              />
            </Grid>
            {selectedInsuranceRate && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, backgroundColor: '#f0f9ff', borderRadius: 2, border: '1px solid #0ea5e9' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Selected Insurance: {selectedInsuranceRate.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Coverage Type: <strong>{selectedInsuranceRate.coverageType}</strong> | Annual Rate: <strong>{selectedInsuranceRate.annualRate}%</strong> | Provider Rate: <strong>{selectedInsuranceRate.providerRate}%</strong>
                  </Typography>
                  {selectedInsuranceRate.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedInsuranceRate.description}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}
            {!watch('insuranceRateId') && (selected?.annualInsuranceRate || selected?.annualInsuranceRateProvider) && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, backgroundColor: '#fff3cd', borderRadius: 2, border: '1px solid #ffc107' }}>
                  <Typography variant="body2" color="warning.main">
                    This offer currently uses legacy insurance rate fields. Select an Insurance Rate product above to migrate to the new system.
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Current Legacy Rates: Annual Rate: {selected?.annualInsuranceRate}% | Provider Rate: {selected?.annualInsuranceRateProvider}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={watch('isDefault') || false}
                    onChange={(e) => setValue('isDefault', e.target.checked)}
                  />
                }
                label="Set as Default Offer"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={watch('status') === 'active'}
                    onChange={(e) => setValue('status', e.target.checked ? 'active' : 'deactive')}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>

          <Box className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/admin/offers')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save Changes
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};
