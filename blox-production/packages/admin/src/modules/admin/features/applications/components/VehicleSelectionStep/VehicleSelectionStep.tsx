import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Input, Button, Loading, Select, type SelectOption } from '@shared/components';
import type { StepProps } from '@shared/components/shared/MultiStepForm/MultiStepForm';
import { supabaseApiService } from '@shared/services';
import type { Product } from '@shared/models/product.model';
import { formatCurrency } from '@shared/utils/formatters';
import {
  DEFAULT_VEHICLE_IMAGE,
  getProductDisplayImage,
  isPublicOrRemoteImageUrl,
  resolveDocumentsSignedUrl,
} from '@shared/utils';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../../../store/hooks';
import './VehicleSelectionStep.scss';

export const VehicleSelectionStep: React.FC<StepProps> = ({ data, updateData }) => {
  const { user } = useAppSelector((state) => state.auth);
  const isDealer = (user?.role || '').toLowerCase() === 'dealer_agent';

  const isCorporate = data?.customerInfo?.applicantType === 'corporate';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageById, setImageById] = useState<Record<string, string>>({});
  const [selectedVehicle, setSelectedVehicle] = useState<Product | null>(
    data.vehicle || (data.vehicleId ? ({ id: data.vehicleId } as Product) : null)
  );
  const [selectedVehicles, setSelectedVehicles] = useState<Product[]>(
    Array.isArray(data.vehicles) ? data.vehicles : data.vehicle ? [data.vehicle] : []
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

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supabaseApiService.queryProducts({
        limit: 2000,
        status: ['active'],
        companyId: isDealer && user?.companyId ? user.companyId : undefined,
      });

      if (response.status === 'SUCCESS' && response.data) {
        setAllProducts(response.data);
      } else {
        throw new Error(response.message || 'Failed to load vehicles');
      }
    } catch (error: any) {
      console.error('❌ Failed to load vehicles:', error);
      toast.error(error.message || 'Failed to load vehicles');
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isDealer, user?.companyId]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    void supabaseApiService.getProductMakes('active').then((res) => {
      if (res.status === 'SUCCESS' && res.data) {
        setMakes(res.data);
      }
    });
  }, []);

  useEffect(() => {
    if (!filterMake) {
      setModels([]);
      return;
    }
    let cancelled = false;
    void supabaseApiService.getProductModels(filterMake, 'active').then((res) => {
      if (cancelled) return;
      if (res.status === 'SUCCESS' && res.data) {
        setModels(res.data);
      } else {
        setModels([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filterMake]);

  const yearOptions = useMemo(() => {
    let source = allProducts;
    if (filterMake) {
      source = source.filter((v) => v.make === filterMake);
    }
    if (filterModel) {
      source = source.filter((v) => v.model === filterModel);
    }
    const years = [...new Set(source.map((v) => v.modelYear).filter(Boolean))].sort((a, b) => b - a);
    return years.map((year) => ({ value: String(year), label: String(year) }));
  }, [allProducts, filterMake, filterModel]);

  const products = useMemo(() => {
    let filtered = allProducts;

    if (filterMake) {
      filtered = filtered.filter((v) => v.make === filterMake);
    }
    if (filterModel) {
      filtered = filtered.filter((v) => v.model === filterModel);
    }
    if (filterYear) {
      const year = Number(filterYear);
      filtered = filtered.filter((v) => v.modelYear === year);
    }
    if (filterCondition) {
      filtered = filtered.filter((v) => v.condition === filterCondition);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.make.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term) ||
          v.id.toLowerCase().includes(term) ||
          (v.trim && v.trim.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [allProducts, filterMake, filterModel, filterYear, filterCondition, searchTerm]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      const needSign: { id: string; ref: string }[] = [];

      for (const p of products) {
        const candidate = getProductDisplayImage(p);
        if (isPublicOrRemoteImageUrl(candidate)) {
          next[p.id] = candidate;
        } else {
          needSign.push({ id: p.id, ref: candidate });
          next[p.id] = DEFAULT_VEHICLE_IMAGE;
        }
      }

      if (needSign.length > 0) {
        const { supabase } = await import('@shared/services');
        await Promise.all(
          needSign.map(async ({ id, ref }) => {
            const signed = await resolveDocumentsSignedUrl(supabase, ref);
            if (signed) next[id] = signed;
          })
        );
      }

      if (!cancelled) setImageById(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [products]);

  const makeOptions: SelectOption[] = useMemo(
    () => makes.map((make) => ({ value: make, label: make })),
    [makes]
  );

  const modelOptions: SelectOption[] = useMemo(
    () => models.map((model) => ({ value: model, label: model })),
    [models]
  );

  const handleMakeFilterChange = (value: string) => {
    setFilterMake(value);
    setFilterModel('');
    setFilterYear('');
  };

  const handleModelFilterChange = (value: string) => {
    setFilterModel(value);
    setFilterYear('');
  };

  const handleClearFilters = () => {
    setFilterMake('');
    setFilterModel('');
    setFilterYear('');
    setFilterCondition('');
    setSearchTerm('');
  };

  const hasActiveFilters =
    Boolean(filterMake || filterModel || filterYear || filterCondition || searchTerm.trim());

  const selectedIds = useMemo(
    () => new Set(selectedVehicles.map((v) => v.id)),
    [selectedVehicles]
  );

  const totalSelectedPrice = useMemo(
    () => selectedVehicles.reduce((sum, v) => sum + (Number(v.price) || 0), 0),
    [selectedVehicles]
  );

  const handleSelectVehicle = (vehicle: Product) => {
    if (isCorporate) {
      const exists = selectedIds.has(vehicle.id);
      const next = exists
        ? selectedVehicles.filter((v) => v.id !== vehicle.id)
        : [...selectedVehicles, vehicle];
      setSelectedVehicles(next);
      // Keep primary vehicle as first selected for installment plan step compatibility
      const primary = next[0] || null;
      setSelectedVehicle(primary);
      updateData({
        vehicles: next,
        vehicleId: primary?.id || null,
        vehicle: primary || null,
      });
      return;
    }
    setSelectedVehicle(vehicle);
    updateData({ vehicleId: vehicle.id, vehicle, vehicles: undefined });
  };

  const handleRemoveSelected = (vehicleId: string) => {
    const next = selectedVehicles.filter((v) => v.id !== vehicleId);
    setSelectedVehicles(next);
    const primary = next[0] || null;
    setSelectedVehicle(primary);
    updateData({
      vehicles: next,
      vehicleId: primary?.id || null,
      vehicle: primary || null,
    });
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
      await loadVehicles();
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
        {isCorporate ? 'Search and Select Vehicles' : 'Search and Select Vehicle'}
      </Typography>
      {isCorporate && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select one or more vehicles. Each selected vehicle will create a separate draft application.
        </Typography>
      )}

      <Box className="filter-section">
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <Select
              label="Make"
              value={filterMake}
              options={makeOptions}
              onChange={(e) => handleMakeFilterChange(String(e.target.value))}
              placeholder="All Makes"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Select
              label="Model"
              value={filterModel}
              options={modelOptions}
              onChange={(e) => handleModelFilterChange(String(e.target.value))}
              placeholder="All Models"
              disabled={!filterMake}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              label="Year"
              value={filterYear}
              options={yearOptions}
              onChange={(e) => setFilterYear(String(e.target.value))}
              placeholder="All Years"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Select
              label="Condition"
              value={filterCondition}
              options={conditionOptions}
              onChange={(e) => setFilterCondition(String(e.target.value))}
              placeholder="All Conditions"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={handleClearFilters} fullWidth>
                Clear Filters
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>

      <Box className="search-section" sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <Box sx={{ flex: 1 }}>
        <Input
          label="Search by Make, Model, Trim, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter vehicle details..."
        />
        </Box>
        <Button variant="secondary" onClick={openAddVehicleDialog}>
          + Add New Vehicle
        </Button>
      </Box>

      {!loading && (
        <Typography variant="body2" color="text.secondary" className="results-count">
          {products.length} vehicle{products.length === 1 ? '' : 's'} found
        </Typography>
      )}

      {loading ? (
        <Loading />
      ) : products.length > 0 ? (
        <Grid container spacing={2} className="vehicles-grid">
          {products.map((vehicle) => {
            const isSelected = isCorporate
              ? selectedIds.has(vehicle.id)
              : selectedVehicle?.id === vehicle.id;
            return (
              <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
                <Paper
                  className={`vehicle-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectVehicle(vehicle)}
                  sx={{ position: 'relative' }}
                >
                  {isCorporate && (
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectVehicle(vehicle)}
                      sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                    />
                  )}
                  <Box className="vehicle-card-image-wrap">
                    <Box className="vehicle-card-check" aria-hidden>
                      ✓
                    </Box>
                    <Box
                      component="img"
                      className="vehicle-card-image"
                      src={imageById[vehicle.id] || getProductDisplayImage(vehicle)}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      loading="lazy"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback === '1') return;
                        img.dataset.fallback = '1';
                        img.src = DEFAULT_VEHICLE_IMAGE;
                      }}
                    />
                  </Box>
                  <Box className="vehicle-card-body">
                    <Typography variant="h4">
                      {vehicle.make} {vehicle.model}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {vehicle.trim} • {vehicle.modelYear}
                    </Typography>
                    <Typography variant="h5" className="price">
                      {formatCurrency(vehicle.price)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {vehicle.condition} • {(vehicle.mileage || 0).toLocaleString()} km
                    </Typography>
                    {isSelected && (
                      <Box className="selected-badge" component="span">
                        Selected
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ mt: 3, textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {hasActiveFilters
              ? 'No vehicles found matching your filters.'
              : 'No vehicles available. Please try searching or check back later.'}
          </Typography>
        </Box>
      )}

      {isCorporate && selectedVehicles.length > 0 && (
        <Box className="selected-vehicle-info" sx={{ mt: 3 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Selected ({selectedVehicles.length}) — Total {formatCurrency(totalSelectedPrice)}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedVehicles.map((v) => (
              <Chip
                key={v.id}
                label={`${v.make} ${v.model} · ${formatCurrency(v.price)}`}
                onDelete={() => handleRemoveSelected(v.id)}
              />
            ))}
          </Box>
        </Box>
      )}

      {!isCorporate && selectedVehicle && (
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
