import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setList, setLoading, setPage, setLimit } from '../../../../store/slices/ledgers.slice';
import { supabaseApiService } from '@shared/services';
import type { Ledger } from '@shared/models/ledger.model';
import { Table, type Column } from '@shared/components';
import { formatCurrency, formatDateTable } from '@shared/utils/formatters';
import './LedgersListPage.scss';

// Dummy data for testing
// Dummy data removed - using only localStorage and API

export const LedgersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { list, loading, pagination } = useAppSelector((state) => state.ledgers);

  useEffect(() => {
    loadLedgers();
  }, [pagination.page, pagination.limit]);

  const loadLedgers = async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getLedgers();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Apply pagination
        const total = supabaseResponse.data.length;
        const start = (pagination.page - 1) * pagination.limit;
        const end = start + pagination.limit;
        const paginatedLedgers = supabaseResponse.data.slice(start, end);
        
        dispatch(setList({ ledgers: paginatedLedgers, total }));
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load ledgers from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load ledgers:', error);
      dispatch(setList({ ledgers: [], total: 0 }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const columns: Column<Ledger>[] = [
    { id: 'id', label: 'ID', minWidth: 100 },
    {
      id: 'transactionType',
      label: 'Transaction Type',
      minWidth: 150,
    },
    {
      id: 'amount',
      label: 'Amount',
      minWidth: 120,
      align: 'right',
      format: (value) => formatCurrency(value),
    },
    {
      id: 'description',
      label: 'Description',
      minWidth: 300,
    },
    {
      id: 'date',
      label: 'Date',
      minWidth: 150,
      format: (value) => formatDateTable(value),
    },
  ];

  return (
    <Box className="ledgers-list-page">
      <Typography variant="h2" className="page-title">
        Ledgers
      </Typography>

      <Table
        columns={columns}
        rows={list}
        loading={loading}
        page={pagination.page - 1}
        rowsPerPage={pagination.limit}
        totalRows={pagination.total}
        onPageChange={(page) => dispatch(setPage(page + 1))}
        onRowsPerPageChange={(limit) => dispatch(setLimit(limit))}
      />
    </Box>
  );
};
