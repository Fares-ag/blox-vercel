import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, IconButton, Chip, Divider } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { CloudUpload, Delete, Add, DirectionsCar, PhotoLibrary, Settings, Info } from '@mui/icons-material';
import { ArrowBack } from '@mui/icons-material';
import { useAppDispatch } from '../../../../store/hooks';
import { addProduct } from '../../../../store/slices/products.slice';
import { supabaseApiService } from '@shared/services';
import type { Product, ProductAttribute } from '@shared/models/product.model';
import { Button, Input, Select, type SelectOption } from '@shared/components';
import { toast } from 'react-toastify';
import { useForm, useFieldArray } from 'react-hook-form';
import './AddVehiclePage.scss';

export const AddVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const conditionOptions: SelectOption[] = [
    { value: 'new', label: 'New' },
    { value: 'old', label: 'Used' },
  ];

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm<Product & { attributes: ProductAttribute[] }>({
    defaultValues: {
      condition: 'new',
      status: 'active',
      mileage: 0,
      images: [],
      documents: [],
      attributes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attributes',
  });

  const condition = watch('condition');

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid image format`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        // TODO: Replace with actual API call when backend is ready
        // const formData = new FormData();
        // formData.append('file', file);
        // formData.append('type', 'image');
        // const response = await apiService.uploadFile('/product/upload-image', formData);
        // if (response.status === 'SUCCESS' && response.data) {
        //   return response.data.url;
        // }

        // Convert to base64 data URL for localStorage persistence
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
              resolve(result); // This is a base64 data URL
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      });

      const urls = await Promise.all(uploadPromises);
      setUploadedImages((prev) => [...prev, ...urls]);
      setValue('images', [...uploadedImages, ...urls] as any);
      toast.success(`${validFiles.length} image(s) uploaded successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  }, [uploadedImages, setValue]);

  const handleRemoveImage = useCallback((index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setValue('images', newImages as any);
  }, [uploadedImages, setValue]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleImageUpload(e.dataTransfer.files);
  }, [handleImageUpload]);

  const onSubmit = useCallback(async (data: any) => {
    try {
      setSaving(true);
      const submitData = {
        ...data,
        images: uploadedImages,
      };

      // Create in Supabase only
      const supabaseResponse = await supabaseApiService.createProduct({
        make: submitData.make,
        model: submitData.model,
        trim: submitData.trim || '',
        modelYear: submitData.modelYear,
        condition: submitData.condition,
        engine: submitData.engine || '',
        color: submitData.color || '',
        mileage: submitData.mileage || 0,
        price: submitData.price,
        status: submitData.status || 'active',
        images: submitData.images || [],
        documents: submitData.documents || [],
        attributes: submitData.attributes || [],
        description: submitData.description || '',
        chassisNumber: submitData.chassisNumber || undefined,
        engineNumber: submitData.engineNumber || undefined,
      });

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        const product = supabaseResponse.data;
        dispatch(addProduct(product));
        toast.success('Vehicle created successfully!');
        navigate(`/admin/vehicles/${product.id}`);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('❌ Failed to create product:', error);
      toast.error(error.message || 'Failed to create product in Supabase');
    } finally {
      setSaving(false);
    }
  }, [uploadedImages, dispatch, navigate]);

  return (
    <Box className="add-vehicle-page">
      <Box className="page-header">
        <Button
          variant="secondary"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/vehicles')}
          className="back-button"
        >
          Back to Vehicles
        </Button>
        <Box className="header-text">
          <Typography variant="h2" className="page-title">
            Add New Vehicle
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            Fill in the vehicle details below to add it to your inventory
          </Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Information Section */}
        <Paper className="form-section">
          <Box className="section-header">
            <Info className="section-icon" />
            <Box>
              <Typography variant="h5" className="section-title">
                Basic Information
              </Typography>
              <Typography variant="body2" className="section-description">
                Enter the fundamental details of the vehicle
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Input
                label="Make"
                {...register('make', { required: 'Make is required' })}
                error={!!errors.make}
                helperText={errors.make?.message}
                placeholder="e.g., Toyota, Honda, Nissan"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Model"
                {...register('model', { required: 'Model is required' })}
                error={!!errors.model}
                helperText={errors.model?.message}
                placeholder="e.g., Camry, Accord, Altima"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Trim"
                {...register('trim')}
                error={!!errors.trim}
                helperText={errors.trim?.message}
                placeholder="e.g., SE, EX-L, SR"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Model Year"
                type="number"
                {...register('modelYear', { required: 'Model Year is required', valueAsNumber: true })}
                error={!!errors.modelYear}
                helperText={errors.modelYear?.message}
                placeholder="e.g., 2023"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Condition"
                options={conditionOptions}
                value={watch('condition') || 'new'}
                onChange={(e) => setValue('condition', e.target.value as 'new' | 'old')}
                error={!!errors.condition}
                helperText={errors.condition?.message}
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
              />
            </Grid>
            <Grid item xs={12}>
              <Input
                label="Description"
                multiline
                rows={4}
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
                placeholder="Provide a detailed description of the vehicle, including features, condition, and any special notes..."
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Specifications Section */}
        <Paper className="form-section">
          <Box className="section-header">
            <DirectionsCar className="section-icon" />
            <Box>
              <Typography variant="h5" className="section-title">
                Specifications & Pricing
              </Typography>
              <Typography variant="body2" className="section-description">
                Vehicle technical specifications and pricing information
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Input
                label="Price (QAR)"
                type="number"
                {...register('price', { required: 'Price is required', valueAsNumber: true })}
                error={!!errors.price}
                helperText={errors.price?.message}
                placeholder="0.00"
              />
            </Grid>
            {condition === 'old' && (
              <Grid item xs={12} sm={6}>
                <Input
                  label="Mileage (km)"
                  type="number"
                  {...register('mileage', { valueAsNumber: true })}
                  error={!!errors.mileage}
                  helperText={errors.mileage?.message}
                  placeholder="0"
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Input
                label="Engine"
                {...register('engine')}
                error={!!errors.engine}
                helperText={errors.engine?.message}
                placeholder="e.g., 2.5L 4-Cylinder"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Color"
                {...register('color')}
                error={!!errors.color}
                helperText={errors.color?.message}
                placeholder="e.g., White, Black, Silver"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Chassis Number"
                {...register('chassisNumber')}
                error={!!errors.chassisNumber}
                helperText={errors.chassisNumber?.message || 'Vehicle chassis/VIN number'}
                placeholder="e.g., JTMHV05J604123456"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Engine Number"
                {...register('engineNumber')}
                error={!!errors.engineNumber}
                helperText={errors.engineNumber?.message || 'Vehicle engine serial number'}
                placeholder="e.g., ENG123456789"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Image Upload Section */}
        <Paper className="form-section">
          <Box className="section-header">
            <PhotoLibrary className="section-icon" />
            <Box>
              <Typography variant="h5" className="section-title">
                Vehicle Images
              </Typography>
              <Typography variant="body2" className="section-description">
                Upload multiple images to showcase the vehicle (minimum 1 image recommended)
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box
                className="image-upload-area"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={uploadingImages}
                />
                <label htmlFor="image-upload" className="upload-label">
                  <Box className="upload-content">
                    <CloudUpload className="upload-icon" />
                    <Typography variant="h6" className="upload-title">
                      {uploadingImages ? 'Uploading...' : 'Drop images here or click to browse'}
                    </Typography>
                    <Typography variant="body2" className="upload-subtitle">
                      Maximum size: 10MB per image • Supported: PNG, JPG, WEBP
                    </Typography>
                    {uploadedImages.length > 0 && (
                      <Chip
                        label={`${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} uploaded`}
                        color="success"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </label>
              </Box>

              {uploadedImages.length > 0 && (
                <Box className="images-grid">
                  {uploadedImages.map((url, index) => (
                    <Box key={index} className="image-preview">
                      <img src={url} alt={`Vehicle ${index + 1}`} />
                      <IconButton
                        className="remove-image-button"
                        onClick={() => handleRemoveImage(index)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                      <Box className="image-number">{index + 1}</Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Additional Attributes Section */}
        <Paper className="form-section">
          <Box className="section-header">
            <Settings className="section-icon" />
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h5" className="section-title">
                  Additional Attributes
                </Typography>
                <Typography variant="body2" className="section-description">
                  Add custom attributes like Transmission, Fuel Type, Seating Capacity, etc.
                </Typography>
              </Box>
              <Button
                variant="secondary"
                startIcon={<Add />}
                onClick={() => append({ id: `attr-${Date.now()}`, name: '', value: '' })}
                className="add-attribute-button"
              >
                Add Attribute
              </Button>
            </Box>
          </Box>
          <Divider sx={{ my: 3 }} />
          {fields.length > 0 ? (
            <Grid container spacing={2}>
                {fields.map((field, index) => (
                <Grid item xs={12} key={field.id}>
                  <Box className="attribute-row">
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid item xs={12} sm={12} md={5}>
                        <Input
                          label="Attribute Name"
                          {...register(`attributes.${index}.name` as const, { required: 'Name is required' })}
                          error={!!errors.attributes?.[index]?.name}
                          helperText={errors.attributes?.[index]?.name?.message}
                          placeholder="e.g., Transmission, Fuel Type"
                        />
                      </Grid>
                      <Grid item xs={12} sm={12} md={5}>
                        <Input
                          label="Attribute Value"
                          {...register(`attributes.${index}.value` as const, { required: 'Value is required' })}
                          error={!!errors.attributes?.[index]?.value}
                          helperText={errors.attributes?.[index]?.value?.message}
                          placeholder="e.g., Automatic, Gasoline"
                        />
                      </Grid>
                      <Grid item xs={12} sm={12} md={2}>
                        <Button
                          variant="text"
                          color="error"
                          onClick={() => remove(index)}
                          startIcon={<Delete />}
                          fullWidth
                          className="remove-attribute-button"
                        >
                          Remove
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box className="empty-attributes">
              <Settings sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                No attributes added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click "Add Attribute" above to add custom vehicle specifications
              </Typography>
            </Box>
          )}
        </Paper>

        <Box className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/admin/vehicles')} size="large">
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving} size="large">
            Create Vehicle
          </Button>
        </Box>
      </form>
    </Box>
  );
};

