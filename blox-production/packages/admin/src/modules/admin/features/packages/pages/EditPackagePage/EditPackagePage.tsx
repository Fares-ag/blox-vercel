import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, IconButton, Divider } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Add, Delete } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setSelected, setLoading, updatePackage } from '../../../../store/slices/packages.slice';
import { supabaseApiService } from '@shared/services';
import type { Package, PackageItem } from '@shared/models/package.model';
import { Button, Input, Select, type SelectOption, Loading } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm, useFieldArray } from 'react-hook-form';
import './EditPackagePage.scss';

// Dummy data removed - using only localStorage and API

export const EditPackagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading } = useAppSelector((state) => state.packages);
  const [saving, setSaving] = useState(false);

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch,
    reset,
  } = useForm<Package & { items: PackageItem[] }>({
    defaultValues: {
      id: '',
      name: '',
      description: '',
      price: 0,
      status: 'active',
      items: [],
      createdAt: '',
      updatedAt: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    if (id && (!selected || selected.id !== id)) {
      loadPackage();
    } else if (selected) {
      // Populate form with existing data
      reset({
        ...selected,
        items: selected.items || [],
      });
    }
  }, [id, selected, reset]);

  const loadPackage = async () => {
    if (!id) return;

    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getPackageById(id);

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setSelected(supabaseResponse.data));
        reset({
          ...supabaseResponse.data,
          items: supabaseResponse.data.items || [],
        });
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load package');
      }
    } catch (error: any) {
      console.error('❌ Failed to load package:', error);
      toast.error(error.message || 'Failed to load package');
      navigate('/admin/packages');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const onSubmit = async (data: any) => {
    if (!id) return;

    try {
      setSaving(true);
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // Update in Supabase only
      const supabaseResponse = await supabaseApiService.updatePackage(id, payload);

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(updatePackage(supabaseResponse.data));
        toast.success('Package updated successfully');
        navigate(`/admin/packages/${id}`);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to update package');
      }
    } catch (error: any) {
      console.error('Update error details:', error);
      toast.error(error.message || 'Failed to update package. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/admin/packages/${id}`);
    } else {
      navigate('/admin/packages');
    }
  };

  const addItem = () => {
    append({ id: `item_${Date.now()}`, name: '', description: '' });
  };

  if (loading && !selected) {
    return <Loading fullScreen message="Loading package..." />;
  }

  return (
    <Box className="edit-package-page">
      <Box className="page-header">
        <Box className="header-left">
          <Button
            variant="text"
            startIcon={<ArrowBack />}
            onClick={handleCancel}
            className="back-button"
          >
            Back
          </Button>
          <Typography variant="h2" className="page-title">
            Edit Package
          </Typography>
        </Box>
      </Box>

      <Paper className="form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Input
                label="Package Name"
                {...register('name', { required: 'Package name is required' })}
                error={!!errors.name}
                helperText={errors.name?.message}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Input
                label="Description"
                {...register('description', { required: 'Description is required' })}
                error={!!errors.description}
                helperText={errors.description?.message}
                multiline
                rows={4}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Input
                label="Price"
                type="number"
                {...register('price', {
                  required: 'Price is required',
                  min: { value: 0, message: 'Price must be greater than or equal to 0' },
                  valueAsNumber: true,
                })}
                error={!!errors.price}
                helperText={errors.price?.message}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Select
                label="Status"
                options={statusOptions}
                value={watch('status') || 'active'}
                onChange={(e) => setValue('status', e.target.value as 'active' | 'inactive')}
                error={!!errors.status}
                helperText={errors.status?.message}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box className="items-section">
                <Box className="items-header">
                  <Typography variant="h6">Package Items</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addItem}
                    size="small"
                  >
                    Add Item
                  </Button>
                </Box>

                {fields.length === 0 ? (
                  <Box className="empty-items">
                    <Typography variant="body2" color="text.secondary">
                      No items added yet. Click "Add Item" to add items to this package.
                    </Typography>
                  </Box>
                ) : (
                  <Box className="items-list">
                    {fields.map((field, index) => (
                      <Paper key={field.id} className="item-card" elevation={1}>
                        <Grid container spacing={2} alignItems="flex-start">
                          <Grid item xs={12} sm={5}>
                            <Input
                              label="Item Name"
                              {...register(`items.${index}.name` as const, {
                                required: 'Item name is required',
                              })}
                              error={!!errors.items?.[index]?.name}
                              helperText={errors.items?.[index]?.name?.message}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Input
                              label="Item Description"
                              {...register(`items.${index}.description` as const, {
                                required: 'Item description is required',
                              })}
                              error={!!errors.items?.[index]?.description}
                              helperText={errors.items?.[index]?.description?.message}
                              multiline
                              rows={2}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={1}>
                            <IconButton
                              color="error"
                              onClick={() => remove(index)}
                              className="delete-item-button"
                            >
                              <Delete />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          <Box className="form-actions">
            <Button variant="outlined" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              Update Package
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

