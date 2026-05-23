import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading } from '../../../../store/slices/promotions.slice';
import { supabaseApiService } from '@shared/services';
import type { Promotion } from '@shared/models/promotion.model';
import { Button, Input, Select, type SelectOption, DatePicker, Loading } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import moment from 'moment';
type Moment = moment.Moment;
import './EditPromotionPage.scss';

export const EditPromotionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.promotions);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Promotion & { startDateMoment: Moment | null; endDateMoment: Moment | null }>({
    defaultValues: selected || {
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

  const loadPromotion = useCallback(async () => {
    if (!id) return;

    try {
      dispatch(setLoading(true));
      const response = await supabaseApiService.getPromotionById(id);

      if (response.status === 'SUCCESS' && response.data) {
        dispatch(setSelected(response.data));
      } else {
        toast.error(response.message || 'Failed to load promotion');
        navigate('/admin/promotions');
      }
    } catch (error: any) {
      console.error('Failed to load promotion:', error);
      toast.error(error.message || 'Failed to load promotion');
      navigate('/admin/promotions');
    } finally {
      dispatch(setLoading(false));
    }
  }, [id, dispatch, navigate]);

  useEffect(() => {
    if (id && (!selected || selected.id !== id)) {
      loadPromotion();
    } else if (selected && selected.id === id) {
      setValue('name', selected.name);
      setValue('description', selected.description);
      setValue('discountType', selected.discountType);
      setValue('discountValue', selected.discountValue);
      setValue('status', selected.status);
      setValue('startDateMoment', selected.startDate ? moment(selected.startDate) : null);
      setValue('endDateMoment', selected.endDate ? moment(selected.endDate) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selected?.id, loadPromotion]);

  const discountTypeOptions: SelectOption[] = [
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed', label: 'Fixed Amount (QAR)' },
  ];

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const onSubmit = useCallback(async (data: any) => {
    if (!id) return;

    try {
      setSaving(true);
      const payload = {
        ...data,
        startDate: data.startDateMoment
          ? data.startDateMoment.format('YYYY-MM-DD')
          : data.startDate,
        endDate: data.endDateMoment
          ? data.endDateMoment.format('YYYY-MM-DD')
          : data.endDate,
      };
      delete payload.startDateMoment;
      delete payload.endDateMoment;

      const response = await supabaseApiService.updatePromotion(id, payload as Promotion);

      if (response.status === 'SUCCESS' && response.data) {
        toast.success('Promotion updated successfully');
        navigate('/admin/promotions');
        return;
      }

      throw new Error(response.message || 'Failed to update promotion');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update promotion');
    } finally {
      setSaving(false);
    }
  }, [id, navigate]);

  if (loading && !selected) {
    return <Loading fullScreen message="Loading promotion..." />;
  }

  return (
    <Box className="edit-promotion-page">
      <Box className="page-header">
        <Button variant="secondary" startIcon={<ArrowBack />} onClick={() => navigate('/admin/promotions')} className="back-button">
          Back to Promotions
        </Button>
        <Typography variant="h2" className="page-title">
          Edit Promotion
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
              Save Changes
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

