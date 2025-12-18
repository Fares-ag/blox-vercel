import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack } from '@mui/icons-material';
import { supabaseApiService } from '@shared/services';
import type { Promotion } from '@shared/models/promotion.model';
import { Button, Input, Select, type SelectOption, DatePicker, Loading } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import moment from 'moment';
type Moment = moment.Moment;
import './AddPromotionPage.scss';

export const AddPromotionPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Promotion & { startDateMoment: Moment | null; endDateMoment: Moment | null }>({
    defaultValues: {
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      startDate: '',
      endDate: '',
      status: 'active',
      startDateMoment: null,
      endDateMoment: null,
    },
  });

  const discountTypeOptions: SelectOption[] = [
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed', label: 'Fixed Amount (QAR)' },
  ];

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      const payload = {
        ...data,
        startDate: data.startDateMoment ? data.startDateMoment.format('YYYY-MM-DD') : data.startDate,
        endDate: data.endDateMoment ? data.endDateMoment.format('YYYY-MM-DD') : data.endDate,
      };
      delete payload.startDateMoment;
      delete payload.endDateMoment;

      const response = await supabaseApiService.createPromotion(payload as Promotion);

      if (response.status === 'SUCCESS' && response.data) {
        toast.success('Promotion created successfully');
        navigate('/admin/promotions');
        return;
      }

      throw new Error(response.message || 'Failed to create promotion');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create promotion');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return <Loading fullScreen message="Creating promotion..." />;
  }

  return (
    <Box className="add-promotion-page">
      <Box className="page-header">
        <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/promotions')} className="back-button">
          Back to Promotions
        </Button>
        <Typography variant="h2" className="page-title">
          Create Promotion
        </Typography>
      </Box>

      <Paper className="form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Input
                label="Promotion Name"
                {...register('name', { required: 'Promotion name is required' })}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="e.g., Summer Sale 2025"
              />
            </Grid>

            <Grid item xs={12}>
              <Input
                label="Description"
                multiline
                rows={4}
                {...register('description', { required: 'Description is required' })}
                error={!!errors.description}
                helperText={errors.description?.message}
                placeholder="Describe the promotion details..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Select
                label="Discount Type"
                value={watch('discountType') || 'percentage'}
                onChange={(e) => setValue('discountType', e.target.value as 'percentage' | 'fixed')}
                options={discountTypeOptions}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label={`Discount Value ${watch('discountType') === 'percentage' ? '(%)' : '(QAR)'}`}
                type="number"
                {...register('discountValue', {
                  required: 'Discount value is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Discount value must be greater than 0' },
                  max: watch('discountType') === 'percentage' ? { value: 100, message: 'Percentage cannot exceed 100%' } : undefined,
                })}
                error={!!errors.discountValue}
                helperText={errors.discountValue?.message}
                placeholder={watch('discountType') === 'percentage' ? 'e.g., 15' : 'e.g., 5000'}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                value={watch('startDateMoment')}
                onChange={(date) => setValue('startDateMoment', date)}
                minDate={moment()}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                value={watch('endDateMoment')}
                onChange={(date) => setValue('endDateMoment', date)}
                minDate={watch('startDateMoment') || moment()}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Select
                label="Status"
                value={watch('status') || 'active'}
                onChange={(e) => setValue('status', e.target.value as 'active' | 'inactive')}
                options={statusOptions}
              />
            </Grid>
          </Grid>

          <Box className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/admin/promotions')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Create Promotion
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

