import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  vehicleService,
  type VehicleFilters,
} from '../../../../services/vehicle.service';
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
  const reservedIdsRef = useRef<string[] | null>(null);
  const reservedEmailRef = useRef<string | undefined>(undefined);

  const ensureReservedIds = useCallback(async (): Promise<string[]> => {
    const email = user?.email ?? undefined;
    // Cache once per browse session / email; empty set is valid.
    if (reservedIdsRef.current !== null && reservedEmailRef.current === email) {
      return reservedIdsRef.current;
    }
    try {
      const reserved = await supabaseApiService.getReservedVehicleIds(email);
      reservedIdsRef.current = Array.from(reserved);
      reservedEmailRef.current = email;
      return reservedIdsRef.current;
    } catch (e) {
      console.error('Failed to load reserved vehicles', e);
      return [];
    }
  }, [user?.email]);

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const excludeIds = await ensureReservedIds();
      const response = await vehicleService.getVehicles({
        ...filters,
        search: searchTerm || undefined,
        excludeIds,
      });

      if (response.status === 'SUCCESS' && response.data) {
        setVehicles(response.data);
        setTotalCount(response.count ?? response.data.length);
      } else {
        throw new Error(response.message || 'Failed to load vehicles');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to load vehicles');
      toast.error(err.message);
      setVehicles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, ensureReservedIds]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<VehicleFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0 });
  };

  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, totalCount);

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

              {totalCount > limit && (
                <Box className="pagination-section">
                  <IconButton
                    size="small"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft />
                  </IconButton>
                  <Typography variant="body2" className="pagination-text">
                    Showing {showingFrom} - {showingTo} of {totalCount}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Next page"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ChevronRight />
                  </IconButton>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
