import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { vehicleService, type VehicleFilters } from '../../../../services/vehicle.service';
import type { Product } from '@shared/models/product.model';
import { VehicleCard } from '../../components/VehicleCard/VehicleCard';
import { VehicleFilter } from '../../components/VehicleFilter/VehicleFilter';
import { SearchBar, Loading, EmptyState } from '@shared/components';
import { toast } from 'react-toastify';
import './VehicleBrowsePage.scss';

// Dummy data for testing
const dummyVehicles: Product[] = [
  {
    id: 'PROD001',
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    modelYear: 2023,
    condition: 'new',
    engine: '2.5L 4-Cylinder',
    color: 'White',
    mileage: 0,
    price: 125000,
    status: 'active',
    images: [],
    documents: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD002',
    make: 'Honda',
    model: 'Accord',
    trim: 'EX-L',
    modelYear: 2023,
    condition: 'new',
    engine: '1.5L Turbo',
    color: 'Black',
    mileage: 0,
    price: 135000,
    status: 'active',
    images: [],
    documents: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD003',
    make: 'Nissan',
    model: 'Altima',
    trim: 'SV',
    modelYear: 2022,
    condition: 'old',
    engine: '2.5L 4-Cylinder',
    color: 'Silver',
    mileage: 15000,
    price: 95000,
    status: 'active',
    images: [],
    documents: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD004',
    make: 'BMW',
    model: '3 Series',
    trim: '330i',
    modelYear: 2023,
    condition: 'new',
    engine: '2.0L Turbo',
    color: 'Blue',
    mileage: 0,
    price: 185000,
    status: 'active',
    images: [],
    documents: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD005',
    make: 'Mercedes-Benz',
    model: 'C-Class',
    trim: 'C300',
    modelYear: 2023,
    condition: 'new',
    engine: '2.0L Turbo',
    color: 'Black',
    mileage: 0,
    price: 195000,
    status: 'active',
    images: [],
    documents: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD006',
    make: 'Toyota',
    model: 'Corolla',
    trim: 'LE',
    modelYear: 2022,
    condition: 'old',
    engine: '1.8L 4-Cylinder',
    color: 'White',
    mileage: 12000,
    price: 75000,
    status: 'active',
    images: [],
    documents: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const VehicleBrowsePage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<VehicleFilters>({
    page: 1,
    limit: 12,
  });
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadVehicles();
  }, [filters, searchTerm]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const searchFilters: VehicleFilters = {
        ...filters,
        search: searchTerm || undefined,
      };

      // For now, use dummy data
      // TODO: Replace with actual API call when backend is ready
      // const response = await vehicleService.getVehicles(searchFilters);
      // if (response.status === 'SUCCESS' && response.data) {
      //   setVehicles(response.data);
      //   setTotalCount(response.meta?.total || response.data.length);
      // }

      // Using dummy data
      let filteredVehicles = [...dummyVehicles];

      // Apply search filter
      if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(
          (v) =>
            v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply other filters
      if (filters.make) {
        filteredVehicles = filteredVehicles.filter((v) => v.make === filters.make);
      }
      if (filters.model) {
        filteredVehicles = filteredVehicles.filter((v) => v.model === filters.model);
      }
      if (filters.condition) {
        filteredVehicles = filteredVehicles.filter((v) => v.condition === filters.condition);
      }
      if (filters.minPrice) {
        filteredVehicles = filteredVehicles.filter((v) => v.price >= filters.minPrice!);
      }
      if (filters.maxPrice) {
        filteredVehicles = filteredVehicles.filter((v) => v.price <= filters.maxPrice!);
      }
      if (filters.minYear) {
        filteredVehicles = filteredVehicles.filter((v) => v.modelYear >= filters.minYear!);
      }
      if (filters.maxYear) {
        filteredVehicles = filteredVehicles.filter((v) => v.modelYear <= filters.maxYear!);
      }

      setVehicles(filteredVehicles);
      setTotalCount(filteredVehicles.length);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load vehicles');
      // Use dummy data on error
      setVehicles(dummyVehicles);
      setTotalCount(dummyVehicles.length);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters({ ...filters, page: 1 }); // Reset to first page on search
  };

  const handleFilterChange = (newFilters: Partial<VehicleFilters>) => {
    setFilters({ ...filters, ...newFilters, page: 1 }); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0 });
  };

  return (
    <Box className="vehicle-browse-page">
      <Box className="page-header">
        <Typography variant="h2">Browse Vehicles</Typography>
        <Typography variant="body2" className="vehicle-count">
          {totalCount} vehicle{totalCount !== 1 ? 's' : ''} available
        </Typography>
      </Box>

      <Box className="search-section">
        <SearchBar
          placeholder="Search by make, model, or ID..."
          onSearch={handleSearch}
          onChange={setSearchTerm}
          value={searchTerm}
        />
      </Box>

      <Box className="main-content-wrapper">
        <Paper className="filter-panel-wrapper">
          <VehicleFilter filters={filters} onChange={handleFilterChange} />
        </Paper>

        <Box className="vehicles-grid-wrapper">
          {loading ? (
            <Box className="loading-container">
              <Loading />
            </Box>
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles found"
              message="Try adjusting your search or filters to find more vehicles."
            />
          ) : (
            <>
              <Box className="vehicles-grid">
                {vehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </Box>

              {/* Pagination - Simple version for now */}
              {totalCount > (filters.limit || 12) && (
                <Box className="pagination-section">
                  <Typography variant="body2" className="pagination-text">
                    Showing {((filters.page || 1) - 1) * (filters.limit || 12) + 1} -{' '}
                    {Math.min((filters.page || 1) * (filters.limit || 12), totalCount)} of {totalCount}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

