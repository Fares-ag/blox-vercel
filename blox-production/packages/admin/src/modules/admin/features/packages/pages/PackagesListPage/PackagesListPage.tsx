import React, { useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading } from '../../../../store/slices/packages.slice';
import { supabaseApiService } from '@shared/services';
import type { Package } from '@shared/models/package.model';
import { Table, type Column, Button, EmptyState, TableSkeleton } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './PackagesListPage.scss';

export const PackagesListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.packages);

  const loadPackages = useCallback(async () => {
    try {
      dispatch(setLoading(true));

      const supabaseResponse = await supabaseApiService.getPackages();

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setList(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load packages from Supabase');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to load packages:', error);
      const message = error instanceof Error ? error.message : 'Failed to load packages from Supabase';
      toast.error(message);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const columns: Column<Package>[] = [
    { id: 'id', label: 'ID', minWidth: 100 },
    {
      id: 'name',
      label: 'Name',
      minWidth: 200,
    },
    {
      id: 'description',
      label: 'Description',
      minWidth: 300,
    },
    {
      id: 'price',
      label: 'Price',
      minWidth: 120,
      align: 'right',
      format: (value) => formatCurrency(value),
    },
  ];

  return (
    <Box className="packages-list-page">
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Packages
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            {list.length} packages · bundle pricing and product groups
          </Typography>
        </Box>
        <Button variant="primary" onClick={() => navigate('/admin/packages/add')}>
          Create Package
        </Button>
      </Box>

      <Box className="table-section">
        {loading && list.length === 0 ? (
          <TableSkeleton rows={8} columns={4} />
        ) : !loading && list.length === 0 ? (
          <EmptyState
            title="No packages yet"
            message="Create a package to group vehicles and pricing."
            actionLabel="Create Package"
            onAction={() => navigate('/admin/packages/add')}
          />
        ) : (
          <Table
            columns={columns}
            rows={list}
            loading={loading}
            onRowClick={(row) => navigate(`/admin/packages/${row.id}`)}
          />
        )}
      </Box>
    </Box>
  );
};
