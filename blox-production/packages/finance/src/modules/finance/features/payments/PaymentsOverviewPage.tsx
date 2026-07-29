import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  type Column,
  Button,
  EmptyState,
  TableSkeleton,
  Card,
  SearchBar,
  StatusBadge,
} from '@shared/components';
import { supabase } from '@shared/services/supabase.service';
import { formatCurrency, formatDate } from '@shared/utils';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import { toast } from 'react-toastify';

type ScheduleRow = {
  id: string;
  application_id: string;
  due_date: string | null;
  amount: number | null;
  status: string | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  paid_date: string | null;
};

type TxnRow = {
  id: string;
  application_id: string | null;
  amount: number | null;
  method: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
};

type TabKey = 'schedules' | 'transactions';

export const PaymentsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const [tab, setTab] = useState<TabKey>('schedules');
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [schedRes, txnRes] = await Promise.all([
        supabase
          .from('payment_schedules')
          .select(
            'id, application_id, due_date, amount, status, paid_amount, remaining_amount, paid_date'
          )
          .order('due_date', { ascending: true })
          .limit(250),
        supabase
          .from('payment_transactions')
          .select('id, application_id, amount, method, status, created_at, completed_at')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (schedRes.error) throw schedRes.error;
      if (txnRes.error) throw txnRes.error;
      setSchedules((schedRes.data || []) as ScheduleRow[]);
      setTxns((txnRes.data || []) as TxnRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load payments';
      setLoadError(message);
      setSchedules([]);
      setTxns([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scheduleFiltered = schedules.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.application_id?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    );
  });

  const txnFiltered = txns.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.application_id?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      r.method?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q)
    );
  });

  const scheduleColumns: Column<ScheduleRow>[] = [
    {
      id: 'application_id',
      label: 'Application',
      format: (v) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {String(v || '').slice(0, 12)}…
        </Typography>
      ),
    },
    {
      id: 'due_date',
      label: 'Due',
      format: (v) => (v ? formatDate(String(v)) : '—'),
    },
    {
      id: 'amount',
      label: 'Amount',
      format: (v) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(v) || 0)}
        </Typography>
      ),
    },
    {
      id: 'remaining_amount',
      label: 'Remaining',
      format: (v) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(v) || 0)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      format: (v) => <StatusBadge status={String(v || '')} type="payment" />,
    },
  ];

  const txnColumns: Column<TxnRow>[] = [
    {
      id: 'application_id',
      label: 'Application',
      format: (v) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {String(v || '').slice(0, 12)}…
        </Typography>
      ),
    },
    {
      id: 'amount',
      label: 'Amount',
      format: (v) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(v) || 0)}
        </Typography>
      ),
    },
    {
      id: 'method',
      label: 'Method',
      format: (v) => String(v || '—'),
    },
    {
      id: 'status',
      label: 'Status',
      format: (v) => String(v || '—'),
    },
    {
      id: 'created_at',
      label: 'Created',
      format: (v) => (v ? formatDate(String(v)) : '—'),
    },
  ];

  return (
    <Box className="finance-overview-page">
      <Typography variant="h2" sx={{ mb: 1 }}>
        Payments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Installment schedules and payment history (read-only).
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v: TabKey) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="schedules" label="Schedules" />
        <Tab value="transactions" label="Transactions" />
      </Tabs>
      <Card sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search…" />
        <Button variant="secondary" onClick={() => load()}>
          Refresh
        </Button>
      </Card>
      {loading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : loadError ? (
        <EmptyState title="Failed to load" message={loadError} actionLabel="Retry" onAction={load} />
      ) : tab === 'schedules' ? (
        scheduleFiltered.length === 0 ? (
          <EmptyState title="No schedules" message="Payment schedules will appear here." />
        ) : (
          <Table
            columns={scheduleColumns}
            rows={scheduleFiltered}
            onRowClick={(row) =>
              navigate(withPortalBase(portalBase, `/applications/view/${row.application_id}`))
            }
          />
        )
      ) : txnFiltered.length === 0 ? (
        <EmptyState title="No transactions" message="Completed payment attempts will appear here." />
      ) : (
        <Table
          columns={txnColumns}
          rows={txnFiltered}
          onRowClick={(row) => {
            if (row.application_id) {
              navigate(withPortalBase(portalBase, `/applications/view/${row.application_id}`));
            }
          }}
        />
      )}
    </Box>
  );
};
