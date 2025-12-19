import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, IconButton, Divider } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { ArrowBack, Add, Delete } from '@mui/icons-material';
import { useAppDispatch } from '../../../../store/hooks';
import { addPackage } from '../../../../store/slices/packages.slice';
import { supabaseApiService } from '@shared/services';
import type { Package, PackageItem } from '@shared/models/package.model';
import { Button, Input, Select, type SelectOption } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm, useFieldArray } from 'react-hook-form';
import './AddPackagePage.scss';

export const AddPackagePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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
  } = useForm<Omit<Package, 'id' | 'createdAt' | 'updatedAt'> & { items: PackageItem[] }>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      status: 'active',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = useCallback(async (data: any) => {
    try {
      setSaving(true);
      
      // Create in Supabase only
      const supabaseResponse = await supabaseApiService.createPackage({
        name: data.name,
        description: data.description,
        items: data.items || [],
        price: data.price,
        status: data.status || 'active',
      });
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(addPackage(supabaseResponse.data));
        toast.success('Package created successfully!');
        navigate('/admin/packages');
      } else {
        throw new Error(supabaseResponse.message || 'Failed to create package');
      }
    } catch (error: any) {
      console.error('❌ Failed to create package:', error);
      toast.error(error.message || 'Failed to create package in Supabase');
    } finally {
      setSaving(false);
    }
  }, [dispatch, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/admin/packages');
  }, [navigate]);

  const addItem = useCallback(() => {
    append({ id: `item_${Date.now()}`, name: '', description: '' });
  }, [append]);

  return (
    <Box className="add-package-page">
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
            Create New Package
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
              Create Package
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

