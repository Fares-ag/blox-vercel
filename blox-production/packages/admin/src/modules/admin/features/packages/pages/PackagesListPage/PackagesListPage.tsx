import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading } from '../../../../store/slices/packages.slice';
import { supabaseApiService } from '@shared/services';
import type { Package } from '@shared/models/package.model';
import { Table, type Column, Button } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './PackagesListPage.scss';

// Using only Supabase - no API or localStorage fallbacks

export const PackagesListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((state) => state.packages);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getPackages();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        dispatch(setList(supabaseResponse.data));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load packages from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load packages:', error);
      toast.error(error.message || 'Failed to load packages from Supabase');
    } finally {
      dispatch(setLoading(false));
    }
  };

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
        <Typography variant="h2">Packages</Typography>
        <Button variant="primary" onClick={() => navigate('/admin/packages/add')}>
          Create Package
        </Button>
      </Box>

      <Table
        columns={columns}
        rows={list}
        loading={loading}
        onRowClick={(row) => navigate(`/admin/packages/${row.id}`)}
      />
    </Box>
  );
};
