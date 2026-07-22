import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  CUSTOMER_MAX_VEHICLE_PRICE_QAR,
  vehicleService,
  type VehicleFilters,
} from '../../../../services/vehicle.service';
import { mergeCatalogWithSeed } from '../../data/catalog-seed';
import type { Product } from '@shared/models/product.model';
import { VehicleCard } from '../../components/VehicleCard/VehicleCard';
import { VehicleFilter } from '../../components/VehicleFilter/VehicleFilter';
import { SearchBar, Loading, EmptyState } from '@shared/components';
import { toast } from 'react-toastify';
import { supabaseApiService } from '@shared/services';
import { useAppSelector } from '../../../../store/hooks';
import './VehicleBrowsePage.scss';

export const VehicleBrowsePage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<VehicleFilters>({
    page: 1,
    limit: 12,
  });
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAppSelector((state) => state.auth);

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

      // Fetch vehicles from Supabase — limit to 120 rows for initial load.
      // Active filtering + price cap further reduce the visible set client-side.
      const response = await supabaseApiService.getProducts({ limit: 120 });
      if (response.status === 'SUCCESS' && response.data) {
        // Merge local Qatar catalog seed; keep only active vehicles ≤ price cap
        let filteredVehicles = mergeCatalogWithSeed(response.data).filter(
          (v) => v.status === 'active' && v.price <= CUSTOMER_MAX_VEHICLE_PRICE_QAR
        );

        // Exclude vehicles reserved by other customers — use the narrow query
        // (vehicle_id only, server-side status + email filter) instead of
        // fetching the full applications table.
        try {
          const reservedVehicleIds = await supabaseApiService.getReservedVehicleIds(
            user?.email ?? undefined
          );
          filteredVehicles = filteredVehicles.filter((v) => !reservedVehicleIds.has(v.id));
        } catch (e) {
          console.error('Failed to filter reserved vehicles', e);
        }

        // Apply search filter
        if (searchTerm) {
          filteredVehicles = filteredVehicles.filter(
            (v) =>
              v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.model.toLowerCase().includes(searchTerm.toLowerCase())
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
        {
          const effectiveMaxPrice = Math.min(
            filters.maxPrice ?? CUSTOMER_MAX_VEHICLE_PRICE_QAR,
            CUSTOMER_MAX_VEHICLE_PRICE_QAR
          );
          filteredVehicles = filteredVehicles.filter((v) => v.price <= effectiveMaxPrice);
        }
        if (filters.minYear) {
          filteredVehicles = filteredVehicles.filter((v) => v.modelYear >= filters.minYear!);
        }
        if (filters.maxYear) {
          filteredVehicles = filteredVehicles.filter((v) => v.modelYear <= filters.maxYear!);
        }

        setVehicles(filteredVehicles);
        setTotalCount(filteredVehicles.length);
      } else {
        throw new Error(response.message || 'Failed to load vehicles');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load vehicles');
      setVehicles([]);
      setTotalCount(0);
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

