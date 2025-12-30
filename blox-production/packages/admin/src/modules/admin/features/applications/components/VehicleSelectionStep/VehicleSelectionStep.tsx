import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Input, Button, Loading, Select, type SelectOption } from '@shared/components';
import type { StepProps } from '@shared/components/shared/MultiStepForm/MultiStepForm';
import { supabaseApiService } from '@shared/services';
import type { Product } from '@shared/models/product.model';
import { formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './VehicleSelectionStep.scss';

// Dummy data removed - using only localStorage and API

export const VehicleSelectionStep: React.FC<StepProps> = ({ data, updateData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Product | null>(
    data.vehicleId ? { id: data.vehicleId } as Product : null
  );

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    trim: '',
    modelYear: new Date().getFullYear(),
    condition: 'new' as 'new' | 'old',
    engine: '',
    color: '',
    mileage: 0,
    price: 0,
    status: 'active' as 'active' | 'inactive',
    description: '',
    chassisNumber: '',
    engineNumber: '',
  });

  const searchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getProducts();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let filtered = supabaseResponse.data;
        
        // Apply search filter if provided
        if (searchTerm) {
          filtered = supabaseResponse.data.filter(
            (v: Product) =>
              v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.id.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        setProducts(filtered);
        if (filtered.length === 0 && !searchTerm) {
          console.log('No vehicles found in Supabase');
        }
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load vehicles');
      }
    } catch (error: any) {
      console.error('❌ Failed to load vehicles:', error);
      toast.error(error.message || 'Failed to load vehicles');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    searchVehicles();
  }, [searchVehicles]);

  const handleSelectVehicle = (vehicle: Product) => {
    setSelectedVehicle(vehicle);
    updateData({ vehicleId: vehicle.id, vehicle });
  };

  const conditionOptions: SelectOption[] = [
    { value: 'new', label: 'New' },
    { value: 'old', label: 'Used' },
  ];

  const statusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const openAddVehicleDialog = () => {
    setNewVehicle({
      make: '',
      model: '',
      trim: '',
      modelYear: new Date().getFullYear(),
      condition: 'new',
      engine: '',
      color: '',
      mileage: 0,
      price: 0,
      status: 'active',
      description: '',
      chassisNumber: '',
      engineNumber: '',
    });
    setAddDialogOpen(true);
  };

  const handleCreateVehicle = async () => {
    // Option A: only require DB-required fields
    if (!newVehicle.make || !newVehicle.model) {
      toast.error('Please fill Make and Model');
      return;
    }
    if (!newVehicle.modelYear || newVehicle.modelYear < 1900) {
      toast.error('Please enter a valid model year');
      return;
    }
    if (newVehicle.price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setCreatingVehicle(true);
    try {
      const res = await supabaseApiService.createProduct({
        make: newVehicle.make,
        model: newVehicle.model,
        trim: newVehicle.trim?.trim() ? newVehicle.trim.trim() : '',
        modelYear: Number(newVehicle.modelYear),
        condition: newVehicle.condition,
        engine: newVehicle.engine,
        color: newVehicle.color,
        mileage: Number(newVehicle.mileage) || 0,
        price: Number(newVehicle.price),
        status: newVehicle.status,
        images: [],
        documents: [],
        attributes: [],
        description: newVehicle.description || undefined,
        chassisNumber: newVehicle.chassisNumber || undefined,
        engineNumber: newVehicle.engineNumber || undefined,
      });

      if (res.status !== 'SUCCESS' || !res.data) {
        throw new Error(res.message || 'Failed to create vehicle');
      }

      toast.success('Vehicle created');
      setAddDialogOpen(false);

      // Refresh list and select new vehicle
      await searchVehicles();
      handleSelectVehicle(res.data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create vehicle');
    } finally {
      setCreatingVehicle(false);
    }
  };

  return (
    <Box className="vehicle-selection-step">
      <Typography variant="h3" className="section-title">
        Search and Select Vehicle
      </Typography>

      <Box className="search-section" sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <Box sx={{ flex: 1 }}>
        <Input
          label="Search by Make, Model, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter vehicle details..."
        />
        </Box>
        <Button variant="secondary" onClick={openAddVehicleDialog}>
          + Add New Vehicle
        </Button>
      </Box>

      {loading ? (
        <Loading />
      ) : products.length > 0 ? (
        <Grid container spacing={2} className="vehicles-grid">
          {products.map((vehicle) => (
            <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
              <Paper
                className={`vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''}`}
                onClick={() => handleSelectVehicle(vehicle)}
              >
                <Typography variant="h4">{vehicle.make} {vehicle.model}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {vehicle.trim} • {vehicle.modelYear}
                </Typography>
                <Typography variant="h5" className="price">
                  {formatCurrency(vehicle.price)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {vehicle.condition} • {vehicle.mileage.toLocaleString()} km
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ mt: 3, textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm ? 'No vehicles found matching your search.' : 'No vehicles available. Please try searching or check back later.'}
          </Typography>
        </Box>
      )}

      {selectedVehicle && (
        <Box className="selected-vehicle-info">
          <Typography variant="h4">Selected Vehicle</Typography>
          <Typography variant="body1">
            {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.trim} ({selectedVehicle.modelYear})
          </Typography>
          <Typography variant="body2">
            Price: {formatCurrency(selectedVehicle.price)}
          </Typography>
        </Box>
      )}

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Vehicle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <Input
                label="Make"
                value={newVehicle.make}
                onChange={(e) => setNewVehicle((v) => ({ ...v, make: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Model"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle((v) => ({ ...v, model: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Trim (optional)"
                value={newVehicle.trim}
                onChange={(e) => setNewVehicle((v) => ({ ...v, trim: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Model Year"
                type="number"
                value={String(newVehicle.modelYear)}
                onChange={(e) => setNewVehicle((v) => ({ ...v, modelYear: parseInt(e.target.value) || new Date().getFullYear() }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Condition"
                value={newVehicle.condition}
                onChange={(e) => setNewVehicle((v) => ({ ...v, condition: e.target.value as any }))}
                options={conditionOptions}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Status"
                value={newVehicle.status}
                onChange={(e) => setNewVehicle((v) => ({ ...v, status: e.target.value as any }))}
                options={statusOptions}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Engine"
                value={newVehicle.engine}
                onChange={(e) => setNewVehicle((v) => ({ ...v, engine: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Color"
                value={newVehicle.color}
                onChange={(e) => setNewVehicle((v) => ({ ...v, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Chassis Number (optional)"
                value={newVehicle.chassisNumber}
                onChange={(e) => setNewVehicle((v) => ({ ...v, chassisNumber: e.target.value }))}
                placeholder="e.g., JTMHV05J604123456"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Engine Number (optional)"
                value={newVehicle.engineNumber}
                onChange={(e) => setNewVehicle((v) => ({ ...v, engineNumber: e.target.value }))}
                placeholder="e.g., ENG123456789"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Mileage (km)"
                type="number"
                value={String(newVehicle.mileage)}
                onChange={(e) => setNewVehicle((v) => ({ ...v, mileage: parseInt(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Price (QAR)"
                type="number"
                value={String(newVehicle.price)}
                onChange={(e) => setNewVehicle((v) => ({ ...v, price: parseFloat(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Input
                label="Description (optional)"
                value={newVehicle.description}
                onChange={(e) => setNewVehicle((v) => ({ ...v, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={() => setAddDialogOpen(false)} disabled={creatingVehicle}>
            Cancel
          </Button>
          <Button onClick={handleCreateVehicle} disabled={creatingVehicle}>
            {creatingVehicle ? 'Creating...' : 'Create Vehicle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
