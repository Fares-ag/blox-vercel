import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading } from '../../../../store/slices/insurance-rates.slice';
import { supabaseApiService } from '@shared/services';
import type { InsuranceRate } from '@shared/models/insurance-rate.model';
import { Table, type Column, Button, StatusBadge, SearchBar, ExportButton, ConfirmDialog } from '@shared/components';
import { toast } from 'react-toastify';
import './InsuranceRatesListPage.scss';

// Dummy data removed - using only localStorage and API

export const InsuranceRatesListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.insuranceRates);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<string | null>(null);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadInsuranceRates = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getInsuranceRates();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let rates = supabaseResponse.data;
        
        // Apply search filter (using debounced term)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          rates = rates.filter((rate: InsuranceRate) =>
            rate.name?.toLowerCase().includes(searchLower) ||
            rate.description?.toLowerCase().includes(searchLower)
          );
        }
        
        dispatch(setList(rates));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load insurance rates from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load insurance rates:', error);
      dispatch(setList([]));
    } finally {
      dispatch(setLoading(false));
    }
  }, [debouncedSearchTerm, dispatch]);

  useEffect(() => {
    loadInsuranceRates();
  }, [loadInsuranceRates]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleDelete = useCallback((rateId: string) => {
    setRateToDelete(rateId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!rateToDelete) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deleteInsuranceRate(rateToDelete);
      
      if (supabaseResponse.status === 'SUCCESS') {
        toast.success('Insurance rate deleted successfully');
        loadInsuranceRates();
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete insurance rate');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete insurance rate:', error);
      toast.error(error.message || 'Failed to delete insurance rate');
    } finally {
      setDeleteDialogOpen(false);
      setRateToDelete(null);
    }
  }, [rateToDelete, loadInsuranceRates]);

  const columns: Column<InsuranceRate>[] = [
    { id: 'id', label: 'ID', minWidth: 100 },
    {
      id: 'name',
      label: 'Name',
      minWidth: 200,
    },
    {
      id: 'coverageType',
      label: 'Coverage Type',
      minWidth: 150,
      format: (value) => (value as string).charAt(0).toUpperCase() + (value as string).slice(1),
    },
    {
      id: 'annualRate',
      label: 'Annual Rate (%)',
      minWidth: 120,
      align: 'right',
      format: (value) => `${value}%`,
    },
    {
      id: 'providerRate',
      label: 'Provider Rate (%)',
      minWidth: 120,
      align: 'right',
      format: (value) => `${value}%`,
    },
    {
      id: 'isDefault',
      label: 'Default',
      minWidth: 100,
      format: (value) => (value ? 'Yes' : 'No'),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value) => <StatusBadge status={value === 'active' ? 'Active' : 'Inactive'} type="application" />,
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 150,
      align: 'center',
      format: (_value, row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Button variant="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/insurance-rates/${row.id}`); }}>
            View
          </Button>
          <Button variant="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/insurance-rates/${row.id}/edit`); }}>
            Edit
          </Button>
          <Button variant="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}>
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box className="insurance-rates-list-page">
      <Box className="page-header">
        <Typography variant="h2">Insurance & Rates</Typography>
        <Box className="header-actions">
          <ExportButton data={list} filename="insurance-rates" />
          <Button variant="primary" onClick={() => navigate('/admin/insurance-rates/add')}>
            Create Insurance Rate
          </Button>
        </Box>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          placeholder="Search insurance rates by name..."
        />
      </Box>

      <Box className="table-section">
        <Table
          columns={columns}
          rows={list}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/insurance-rates/${row.id}`)}
        />
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Insurance Rate"
        message="Are you sure you want to delete this insurance rate? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setRateToDelete(null);
        }}
      />
    </Box>
  );
};

