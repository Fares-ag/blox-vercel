import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading } from '../../../../store/slices/promotions.slice';
import { supabaseApiService } from '@shared/services';
import type { Promotion } from '@shared/models/promotion.model';
import { Table, type Column, Button, StatusBadge, SearchBar, ExportButton, ConfirmDialog } from '@shared/components';
import { formatDate } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './PromotionsListPage.scss';

// Using only Supabase - no API or localStorage fallbacks

export const PromotionsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.promotions);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadPromotions = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getPromotions();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let promotions = supabaseResponse.data;
        
        // Apply search filter (using debounced term)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          promotions = promotions.filter((promo: Promotion) =>
            promo.name?.toLowerCase().includes(searchLower) ||
            promo.id?.toLowerCase().includes(searchLower)
          );
        }
        
        dispatch(setList(promotions));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load promotions from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load promotions:', error);
      toast.error(error.message || 'Failed to load promotions from Supabase');
    } finally {
      dispatch(setLoading(false));
    }
  }, [debouncedSearchTerm, dispatch]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleDelete = useCallback((promotionId: string) => {
    setPromotionToDelete(promotionId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!promotionToDelete) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deletePromotion(promotionToDelete);
      
      if (supabaseResponse.status === 'SUCCESS') {
        toast.success('Promotion deleted successfully');
        loadPromotions();
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete promotion');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete promotion:', error);
      toast.error(error.message || 'Failed to delete promotion from Supabase');
    } finally {
      setDeleteDialogOpen(false);
      setPromotionToDelete(null);
    }
  }, [promotionToDelete, loadPromotions]);

  const columns: Column<Promotion>[] = [
    { id: 'id', label: 'ID', minWidth: 100 },
    {
      id: 'name',
      label: 'Name',
      minWidth: 200,
    },
    {
      id: 'discountValue',
      label: 'Discount',
      minWidth: 120,
      format: (value, row) => `${value}${row.discountType === 'percentage' ? '%' : ' QAR'}`,
    },
    {
      id: 'startDate',
      label: 'Start Date',
      minWidth: 150,
      format: (value) => formatDate(value),
    },
    {
      id: 'endDate',
      label: 'End Date',
      minWidth: 150,
      format: (value) => formatDate(value),
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
          <Button variant="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/promotions/${row.id}`); }}>
            View
          </Button>
          <Button variant="small" onClick={(e) => { e.stopPropagation(); navigate(`/admin/promotions/${row.id}/edit`); }}>
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
    <Box className="promotions-list-page">
      <Box className="page-header">
        <Typography variant="h2">Promotions</Typography>
        <Box className="header-actions">
          <ExportButton data={list} filename="promotions" />
          <Button variant="primary" onClick={() => navigate('/admin/promotions/add')}>
            Create Promotion
          </Button>
        </Box>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          placeholder="Search promotions by name..."
        />
      </Box>

      <Box className="table-section">
        <Table
          columns={columns}
          rows={list}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/promotions/${row.id}`)}
        />
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setPromotionToDelete(null);
        }}
      />
    </Box>
  );
};
