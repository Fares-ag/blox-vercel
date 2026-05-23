import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useAppDispatch } from '../../../../store/hooks';
import { addOffer } from '../../../../store/slices/offers.slice';
import { supabaseApiService } from '@shared/services';
import type { Offer } from '@shared/models/offer.model';
import { Button, Input } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import './AddOfferPage.scss';

// Using only Supabase - no API or localStorage fallbacks

export const AddOfferPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>>({
    defaultValues: {
      name: '',
      annualRentRate: 0,
      annualRentRateFunder: 0,
      annualInsuranceRate: 0,
      annualInsuranceRateProvider: 0,
      isDefault: false,
      status: 'active',
      isAdmin: false,
    },
  });


  const onSubmit = useCallback(async (data: any) => {
    try {
      setSaving(true);
      // Create in Supabase only
      const supabaseResponse = await supabaseApiService.createOffer({
        name: data.name,
        annualRentRate: data.annualRentRate,
        annualRentRateFunder: data.annualRentRateFunder,
        annualInsuranceRate: data.annualInsuranceRate || 0,
        annualInsuranceRateProvider: data.annualInsuranceRateProvider || 0,
        isDefault: data.isDefault || false,
        status: data.status || 'active',
        isAdmin: data.isAdmin || false,
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(addOffer(supabaseResponse.data));
        toast.success('Offer created successfully!');
        navigate('/admin/offers');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to create offer');
      }
    } catch (error: any) {
      console.error('❌ Failed to create offer:', error);
      toast.error(error.message || 'Failed to create offer in Supabase');
    } finally {
      setSaving(false);
    }
  }, [dispatch, navigate]);

  return (
    <Box className="add-offer-page">
      <Box className="page-header">
        <Button variant="secondary" onClick={() => navigate('/admin/offers')}>
          Cancel
        </Button>
        <Typography variant="h2">Create New Offer</Typography>
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
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Insurance Rate (%)"
                type="number"
                {...register('annualInsuranceRate', { valueAsNumber: true })}
                error={!!errors.annualInsuranceRate}
                inputProps={{ step: 0.01 }}
                helperText={errors.annualInsuranceRate?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Insurance Rate Provider (%)"
                type="number"
                {...register('annualInsuranceRateProvider', { valueAsNumber: true })}
                error={!!errors.annualInsuranceRateProvider}
                inputProps={{ step: 0.01 }}
                helperText={errors.annualInsuranceRateProvider?.message}
              />
            </Grid>
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
              Create Offer
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};
