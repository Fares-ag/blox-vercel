import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Checkbox, Menu, MenuItem } from '@mui/material';
import { Edit, Delete, MoreVert } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading, setPage, setLimit, setFilters, clearFilters, removeProduct, setError } from '../../../../store/slices/products.slice';
import { supabaseApiService } from '@shared/services';
import type { Company } from '@shared/models';
import type { Product } from '@shared/models/product.model';
import { Table, type Column, Button, StatusBadge, SearchBar, FilterPanel, type FilterConfig, ExportButton, ConfirmDialog, EmptyState, TableSkeleton } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { formatProductDisplayTitle, useDebounce } from '@shared/utils';
import { toast } from 'react-toastify';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import './ProductsListPage.scss';

export const ProductsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const { user } = useAppSelector((state) => state.auth);
  const role = (user?.role || '').toLowerCase();
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const isDealer = role === 'dealer_agent';
  const canManageVehicles = isAdminRole || isDealer;
  /** Dealers may only mutate rows owned by their own company (mirrors RLS). */
  const canEditRow = useCallback(
    (row: Product) => isAdminRole || (isDealer && !!user?.companyId && row.companyId === user.companyId),
    [isAdminRole, isDealer, user?.companyId]
  );
  const { list, loading, pagination, filters } = useAppSelector((state) => state.products);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkActionsAnchor, setBulkActionsAnchor] = useState<null | HTMLElement>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [partners, setPartners] = useState<Company[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search by 300ms

  useEffect(() => {
    if (!isAdminRole) return;
    void supabaseApiService.getCompanies().then((res) => {
      if (res.status === 'SUCCESS' && res.data) setPartners(res.data);
    });
  }, [isAdminRole]);

  const loadProducts = useCallback(async () => {
    try {
      dispatch(setLoading(true));

      const offset = (pagination.page - 1) * pagination.limit;
      const priceRange = filters.priceRange;
      // Dealer: always scope to own company. Admin: optional Partner filter.
      const companyId =
        isDealer && user?.companyId
          ? user.companyId
          : isAdminRole && filters.companyId
            ? filters.companyId
            : undefined;

      const supabaseResponse = await supabaseApiService.queryProducts({
        limit: pagination.limit,
        offset,
        skipCache: true,
        companyId,
        status: filters.status?.length ? filters.status : undefined,
        condition: filters.condition?.length ? filters.condition : undefined,
        priceMin: priceRange?.[0],
        priceMax: priceRange?.[1],
        search: debouncedSearchTerm || undefined,
      });

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Bulk select is current page only — do not silently select across 10k.
        setSelectedProducts(new Set());
        dispatch(
          setList({
            products: supabaseResponse.data,
            total: supabaseResponse.count ?? supabaseResponse.data.length,
          })
        );
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
  }, [pagination.page, pagination.limit, filters, debouncedSearchTerm, dispatch, isDealer, isAdminRole, user?.companyId]);

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
    ...(isAdminRole
      ? [
          {
            id: 'companyId',
            label: 'Partner',
            type: 'select' as const,
            options: [
              { value: '', label: 'All partners' },
              ...partners.map((c) => ({ value: c.id, label: c.name })),
            ],
          },
        ]
      : []),
    { id: 'condition', label: 'Condition', type: 'multiselect', options: [
      { value: 'new', label: 'New' },
      { value: 'old', label: 'Old' },
    ]},
    { id: 'status', label: 'Status', type: 'multiselect', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
    { id: 'priceRange', label: 'Price Range', type: 'range', min: 0, max: 1000000, step: 5000 },
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
      label: 'Vehicle',
      minWidth: 220,
      format: (_v, row) => formatProductDisplayTitle(row),
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
      format: (_value, row) =>
        canEditRow(row) ? (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(withPortalBase(portalBase, `/vehicles/${row.id}/edit`));
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
        ) : null,
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
          {canManageVehicles && (
            <Button variant="primary" onClick={() => navigate(withPortalBase(portalBase, '/vehicles/add'))}>
              Add Vehicle
            </Button>
          )}
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
        {loading && list.length === 0 ? (
          <TableSkeleton rows={8} columns={6} />
        ) : !loading && list.length === 0 ? (
          <EmptyState
            title="No vehicles match"
            message={
              canManageVehicles
                ? 'Adjust filters or add a vehicle to the catalog.'
                : 'Adjust filters or ask an admin if a vehicle is missing from the catalog.'
            }
            actionLabel={canManageVehicles ? 'Add Vehicle' : undefined}
            onAction={
              canManageVehicles
                ? () => navigate(withPortalBase(portalBase, '/vehicles/add'))
                : undefined
            }
          />
        ) : (
          <Table
            columns={columns}
            rows={list}
            loading={loading}
            page={pagination.page - 1}
            rowsPerPage={pagination.limit}
            totalRows={pagination.total}
            onPageChange={(page) => dispatch(setPage(page + 1))}
            onRowsPerPageChange={(limit) => dispatch(setLimit(limit))}
            onRowClick={(row) =>
              navigate(withPortalBase(portalBase, `/vehicles/${row.id}`))
            }
          />
        )}
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
