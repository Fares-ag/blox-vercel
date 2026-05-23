import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useAppDispatch } from '../../../../store/hooks';
import { addInsuranceRate } from '../../../../store/slices/insurance-rates.slice';
import { supabaseApiService } from '@shared/services';
import type { InsuranceRate } from '@shared/models/insurance-rate.model';
import { Button, Input, Select, type SelectOption } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import './AddInsuranceRatePage.scss';

export const AddInsuranceRatePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Omit<InsuranceRate, 'id' | 'createdAt' | 'updatedAt'>>({
    defaultValues: {
      name: '',
      description: '',
      annualRate: 0,
      providerRate: 0,
      coverageType: 'comprehensive',
      status: 'active',
      isDefault: false,
    },
  });

  const coverageTypeOptions: SelectOption[] = [
    { value: 'comprehensive', label: 'Comprehensive' },
    { value: 'third-party', label: 'Third-Party' },
    { value: 'full', label: 'Full' },
  ];

  const onSubmit = useCallback(async (data: any) => {
    try {
      setSaving(true);
      
      // Create in Supabase only
      const supabaseResponse = await supabaseApiService.createInsuranceRate({
        name: data.name,
        description: data.description,
        annualRate: data.annualRate,
        providerRate: data.providerRate,
        coverageType: data.coverageType,
        status: data.status || 'active',
        isDefault: data.isDefault || false,
        minVehicleValue: data.minVehicleValue,
        maxVehicleValue: data.maxVehicleValue,
        minTenure: data.minTenure,
        maxTenure: data.maxTenure,
      });

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(addInsuranceRate(supabaseResponse.data));
        toast.success('Insurance rate created successfully');
        navigate('/admin/insurance-rates');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to create insurance rate');
      }
    } catch (error: any) {
      console.error('❌ Failed to create insurance rate:', error);
      toast.error(error.message || 'Failed to create insurance rate');
    } finally {
      setSaving(false);
    }
  }, [dispatch, navigate]);

  return (
    <Box className="add-insurance-rate-page">
      <Box className="page-header">
        <Button variant="secondary" onClick={() => navigate('/admin/insurance-rates')}>
          Cancel
        </Button>
        <Typography variant="h2">Create New Insurance Rate</Typography>
      </Box>

      <Paper className="form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Input
                label="Name"
                {...register('name', { required: 'Insurance rate name is required' })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <Input
                label="Description"
                multiline
                rows={3}
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Annual Rate (%)"
                type="number"
                inputProps={{ step: '0.01' }}
                {...register('annualRate', { 
                  required: 'Annual rate is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Rate must be positive' },
                })}
                error={!!errors.annualRate}
                helperText={errors.annualRate?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Provider Rate (%)"
                type="number"
                inputProps={{ step: '0.01' }}
                {...register('providerRate', { 
                  required: 'Provider rate is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Rate must be positive' },
                })}
                error={!!errors.providerRate}
                helperText={errors.providerRate?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Coverage Type"
                value={watch('coverageType') || 'comprehensive'}
                onChange={(e) => setValue('coverageType', e.target.value as 'comprehensive' | 'third-party' | 'full')}
                options={coverageTypeOptions}
                required
                error={!!errors.coverageType}
                helperText={errors.coverageType?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Minimum Vehicle Value (Optional)"
                type="number"
                {...register('minVehicleValue', { valueAsNumber: true })}
                error={!!errors.minVehicleValue}
                helperText={errors.minVehicleValue?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Maximum Vehicle Value (Optional)"
                type="number"
                {...register('maxVehicleValue', { valueAsNumber: true })}
                error={!!errors.maxVehicleValue}
                helperText={errors.maxVehicleValue?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Minimum Tenure (months, Optional)"
                type="number"
                {...register('minTenure', { valueAsNumber: true })}
                error={!!errors.minTenure}
                helperText={errors.minTenure?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Maximum Tenure (months, Optional)"
                type="number"
                {...register('maxTenure', { valueAsNumber: true })}
                error={!!errors.maxTenure}
                helperText={errors.maxTenure?.message}
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
                label="Set as Default Insurance Rate"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={watch('status') === 'active'}
                    onChange={(e) => setValue('status', e.target.checked ? 'active' : 'inactive')}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>

          <Box className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/admin/insurance-rates')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Create Insurance Rate
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

