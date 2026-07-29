import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  Table,
  type Column,
  Button,
  EmptyState,
  TableSkeleton,
  Card,
  SearchBar,
} from '@shared/components';
import { supabase } from '@shared/services/supabase.service';
import { formatCurrency, formatDate } from '@shared/utils';
import { toast } from 'react-toastify';

type CreditRow = {
  user_email: string;
  balance: number | null;
  updated_at: string | null;
};

/** Read-only Blox Credits balances (`user_credits`). No top-up / adjust here. */
export const CreditsOverviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('user_credits')
        .select('user_email, balance, updated_at')
        .order('balance', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data || []) as CreditRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load credits';
      setLoadError(message);
      setRows([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!searchTerm) return true;
    return r.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const columns: Column<CreditRow>[] = [
    {
      id: 'user_email',
      label: 'Customer email',
      format: (v) => String(v || '—'),
    },
    {
      id: 'balance',
      label: 'Balance',
      format: (v) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(v) || 0)}
        </Typography>
      ),
    },
    {
      id: 'updated_at',
      label: 'Updated',
      format: (v) => (v ? formatDate(String(v)) : '—'),
    },
  ];

  return (
    <Box className="finance-overview-page">
      <Typography variant="h2" sx={{ mb: 1 }}>
        Customer credits
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Read-only Blox Credits balances. Adjustments remain admin-only.
      </Typography>
      <Card sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search email…" />
        <Button variant="secondary" onClick={() => load()}>
          Refresh
        </Button>
      </Card>
      {loading ? (
        <TableSkeleton rows={8} columns={3} />
      ) : loadError ? (
        <EmptyState title="Failed to load" message={loadError} actionLabel="Retry" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No credit balances" message="Customer credit balances will appear here." />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}
    </Box>
  );
};
