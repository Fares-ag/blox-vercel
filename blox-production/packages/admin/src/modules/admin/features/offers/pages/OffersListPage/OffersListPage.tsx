import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading } from '../../../../store/slices/offers.slice';
import { supabaseApiService } from '@shared/services';
import type { Offer } from '@shared/models/offer.model';
import { Table, type Column, Button, StatusBadge, SearchBar, ExportButton, ConfirmDialog } from '@shared/components';
import { toast } from 'react-toastify';
import './OffersListPage.scss';

// Dummy data removed - using only localStorage and API

export const OffersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.offers);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadOffers = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getOffers();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let offers = supabaseResponse.data;
        
        // Apply search filter (using debounced term)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          offers = offers.filter((offer: Offer) =>
            offer.name?.toLowerCase().includes(searchLower) ||
            offer.id?.toLowerCase().includes(searchLower)
          );
        }
        
        dispatch(setList(offers));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load offers from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load offers:', error);
      toast.error(error.message || 'Failed to load offers from Supabase');
    } finally {
      dispatch(setLoading(false));
    }
  }, [debouncedSearchTerm, dispatch]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleDelete = useCallback((offerId: string) => {
    setOfferToDelete(offerId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!offerToDelete) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deleteOffer(offerToDelete);
      
      if (supabaseResponse.status === 'SUCCESS') {
        toast.success('Offer deleted successfully');
        loadOffers();
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete offer');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete offer');
    } finally {
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
    }
  }, [offerToDelete, loadOffers]);

  const columns: Column<Offer>[] = [
    { id: 'id', label: 'ID', minWidth: 100 },
    {
      id: 'name',
      label: 'Name',
      minWidth: 200,
    },
    {
      id: 'annualRentRate',
      label: 'Annual Rent Rate (%)',
      minWidth: 150,
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
          <Button variant="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/offers/${row.id}`); }}>
            View
          </Button>
          <Button variant="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/offers/${row.id}/edit`); }}>
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
    <Box className="offers-list-page">
      <Box className="page-header">
        <Typography variant="h2">Offers</Typography>
        <Box className="header-actions">
          <ExportButton data={list} filename="offers" />
          <Button variant="primary" onClick={() => navigate('/admin/offers/add')}>
            Create Offer
          </Button>
        </Box>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          placeholder="Search offers by name..."
        />
      </Box>

      <Box className="table-section">
        <Table
          columns={columns}
          rows={list}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/offers/${row.id}`)}
        />
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Offer"
        message="Are you sure you want to delete this offer? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setOfferToDelete(null);
        }}
      />
    </Box>
  );
};
