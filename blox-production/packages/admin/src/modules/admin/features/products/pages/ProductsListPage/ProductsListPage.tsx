import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Checkbox, Menu, MenuItem } from '@mui/material';
import { Edit, Delete, MoreVert } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading, setPage, setLimit, setFilters, clearFilters, removeProduct, setError } from '../../../../store/slices/products.slice';
import { supabaseApiService } from '@shared/services';
import type { Product } from '@shared/models/product.model';
import { Table, type Column, Button, StatusBadge, SearchBar, FilterPanel, type FilterConfig, ExportButton, ConfirmDialog } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { useDebounce } from '@shared/utils';
import { toast } from 'react-toastify';
import './ProductsListPage.scss';

// Using only Supabase - no API or localStorage fallbacks

export const ProductsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading, pagination, filters } = useAppSelector((state) => state.products);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkActionsAnchor, setBulkActionsAnchor] = useState<null | HTMLElement>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search by 300ms

  const loadProducts = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getProducts();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let products = supabaseResponse.data;
        
        // Apply search filter (using debounced term)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          products = products.filter((p: Product) =>
            p.make?.toLowerCase().includes(searchLower) ||
            p.model?.toLowerCase().includes(searchLower) ||
            p.id?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply status filter
        const statusFilter = filters.status;
        if (statusFilter && statusFilter.length > 0) {
          products = products.filter((p: Product) => statusFilter.includes(p.status));
        }
        
        // Apply condition filter
        const conditionFilter = filters.condition;
        if (conditionFilter && conditionFilter.length > 0) {
          products = products.filter((p: Product) => conditionFilter.includes(p.condition));
        }
        
        // Apply price range filter
        if (filters.priceRange) {
          const [min, max] = filters.priceRange;
          products = products.filter((p: Product) => p.price >= min && p.price <= max);
        }
        
        // Pagination
        const total = products.length;
        const start = (pagination.page - 1) * pagination.limit;
        const end = start + pagination.limit;
        const paginatedProducts = products.slice(start, end);
        
        dispatch(setList({ products: paginatedProducts, total }));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load products from Supabase');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to load products from Supabase');
      if (import.meta.env.DEV) {
        console.error('Failed to load products:', err);
      }
      dispatch(setError(err.message));
      toast.error(err.message);
    } finally {
      dispatch(setLoading(false));
    }
  }, [pagination.page, pagination.limit, filters, debouncedSearchTerm, dispatch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    dispatch(setPage(1));
  }, [dispatch]);

  const handleFilterChange = useCallback((newFilters: Record<string, unknown>) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    setSearchTerm('');
  }, [dispatch]);

  const handleDelete = useCallback((productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!productToDelete) return;

    try {
      // Delete from Supabase only
      const supabaseResponse = await supabaseApiService.deleteProduct(productToDelete);
      
      if (supabaseResponse.status === 'SUCCESS') {
        dispatch(removeProduct(productToDelete));
        toast.success('Vehicle deleted successfully');
        loadProducts();
      } else {
        throw new Error(supabaseResponse.message || 'Failed to delete vehicle');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete vehicle:', error);
      toast.error(error.message || 'Failed to delete vehicle');
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  }, [productToDelete, dispatch, loadProducts]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(list.map((p) => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  }, [list]);

  const handleSelectProduct = useCallback((productId: string, checked: boolean) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const handleBulkAction = useCallback(async (action: 'activate' | 'deactivate') => {
    if (selectedProducts.size === 0) {
      toast.warning('Please select at least one vehicle');
      return;
    }

    try {
      setBulkActionLoading(true);
      const status = action === 'activate' ? 'active' : 'inactive';
      const ids = Array.from(selectedProducts);
      
      const response = await supabaseApiService.bulkUpdateProductStatus(ids, status);
      
      if (response.status === 'SUCCESS' && response.data) {
        toast.success(`Successfully ${action}d ${response.data.updated} vehicle(s)`);
        setSelectedProducts(new Set());
        loadProducts();
      } else {
        throw new Error(response.message || `Failed to ${action} vehicles`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to ${action} vehicles:`, error);
      toast.error(error.message || `Failed to ${action} vehicles`);
    } finally {
      setBulkActionLoading(false);
      setBulkActionsAnchor(null);
    }
  }, [selectedProducts, loadProducts]);

  const filterConfigs: FilterConfig[] = [
    { id: 'condition', label: 'Condition', type: 'multiselect', options: [
      { value: 'new', label: 'New' },
      { value: 'old', label: 'Old' },
    ]},
    { id: 'status', label: 'Status', type: 'multiselect', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
    { id: 'priceRange', label: 'Price Range', type: 'range', min: 0, max: 500000, step: 1000 },
  ];

  const columns: Column<Product>[] = [
    {
      id: 'select',
      label: '',
      minWidth: 50,
      align: 'center',
      format: (_value, row) => (
        <Checkbox
          checked={selectedProducts.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleSelectProduct(row.id, e.target.checked);
          }}
          size="small"
        />
      ),
    },
    { id: 'id', label: 'ID', minWidth: 100 },
    {
      id: 'make',
      label: 'Make',
      minWidth: 100,
    },
    {
      id: 'model',
      label: 'Model',
      minWidth: 150,
    },
    {
      id: 'modelYear',
      label: 'Year',
      minWidth: 80,
    },
    {
      id: 'price',
      label: 'Price',
      minWidth: 120,
      align: 'right',
      format: (value) => formatCurrency(value),
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
      minWidth: 120,
      align: 'center',
      format: (_value, row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/vehicles/${row.id}/edit`);
            }}
            color="primary"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            color="error"
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box className="products-list-page">
      <Box className="page-header">
        <Typography variant="h2">Vehicles</Typography>
        <Box className="header-actions">
          {selectedProducts.size > 0 && (
            <>
              <Typography variant="body2" sx={{ mr: 2, alignSelf: 'center' }}>
                {selectedProducts.size} selected
              </Typography>
              <Button
                variant="secondary"
                onClick={(e) => setBulkActionsAnchor(e.currentTarget)}
                disabled={bulkActionLoading}
                endIcon={<MoreVert />}
              >
                Bulk Actions
              </Button>
              <Menu
                anchorEl={bulkActionsAnchor}
                open={Boolean(bulkActionsAnchor)}
                onClose={() => setBulkActionsAnchor(null)}
              >
                <MenuItem onClick={() => handleBulkAction('activate')}>
                  Activate Selected
                </MenuItem>
                <MenuItem onClick={() => handleBulkAction('deactivate')}>
                  Deactivate Selected
                </MenuItem>
              </Menu>
            </>
          )}
          <ExportButton data={list} filename="vehicles" />
          <Button variant="primary" onClick={() => navigate('/admin/vehicles/add')}>
            Add Vehicle
          </Button>
        </Box>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          placeholder="Search products by make, model, or ID..."
        />
      </Box>

      <Box className="filter-section">
        <FilterPanel
          filters={filterConfigs}
          values={filters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          title="Vehicle Filters"
        />
      </Box>

      <Box className="table-section">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Checkbox
            checked={selectedProducts.size > 0 && selectedProducts.size === list.length}
            indeterminate={selectedProducts.size > 0 && selectedProducts.size < list.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            Select All
          </Typography>
        </Box>
        <Table
          columns={columns}
          rows={list}
          loading={loading}
          page={pagination.page - 1}
          rowsPerPage={pagination.limit}
          totalRows={pagination.total}
          onPageChange={(page) => dispatch(setPage(page + 1))}
          onRowsPerPageChange={(limit) => dispatch(setLimit(limit))}
          onRowClick={(row) => navigate(`/admin/vehicles/${row.id}`)}
        />
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Vehicle"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
      />
    </Box>
  );
};
