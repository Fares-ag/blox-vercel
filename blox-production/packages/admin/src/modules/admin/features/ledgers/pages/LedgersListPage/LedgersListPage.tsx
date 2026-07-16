import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setList, setLoading, setPage, setLimit } from '../../../../store/slices/ledgers.slice';
import { supabaseApiService } from '@shared/services';
import type { Ledger } from '@shared/models/ledger.model';
import { Table, type Column, SearchBar, EmptyState, TableSkeleton, Button } from '@shared/components';
import { formatCurrency, formatDateTable } from '@shared/utils/formatters';
import './LedgersListPage.scss';

export const LedgersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { list, loading, pagination } = useAppSelector((state) => state.ledgers);
  const [searchTerm, setSearchTerm] = useState('');
  const [allLedgers, setAllLedgers] = useState<Ledger[]>([]);

  const loadLedgers = useCallback(async () => {
    try {
      dispatch(setLoading(true));

      const supabaseResponse = await supabaseApiService.getLedgers();

      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        setAllLedgers(supabaseResponse.data);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load ledgers from Supabase');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to load ledgers:', error);
      setAllLedgers([]);
      dispatch(setList({ ledgers: [], total: 0 }));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    loadLedgers();
  }, [loadLedgers]);

  const filtered = useMemo(() => {
    if (!searchTerm) return allLedgers;
    const q = searchTerm.toLowerCase();
    return allLedgers.filter(
      (row) =>
        row.id?.toLowerCase().includes(q) ||
        row.transactionType?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q)
    );
  }, [allLedgers, searchTerm]);

  useEffect(() => {
    const total = filtered.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    dispatch(setList({ ledgers: filtered.slice(start, end), total }));
  }, [filtered, pagination.page, pagination.limit, dispatch]);

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
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Ledgers
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            {filtered.length} transactions · financial activity log
          </Typography>
        </Box>
        <Button variant="secondary" onClick={loadLedgers} loading={loading}>
          Refresh
        </Button>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            dispatch(setPage(1));
          }}
          placeholder="Search by ID, type, or description..."
        />
      </Box>

      <Box className="table-section">
        {loading && allLedgers.length === 0 ? (
          <TableSkeleton rows={8} columns={5} />
        ) : !loading && filtered.length === 0 ? (
          <EmptyState
            title="No ledger entries"
            message={searchTerm ? 'No transactions match your search.' : 'Ledger activity will appear here.'}
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
          />
        )}
      </Box>
    </Box>
  );
};
