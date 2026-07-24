import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  type Column,
  Button,
  StatusBadge,
  SearchBar,
  EmptyState,
  TableSkeleton,
  Card,
} from '@shared/components';
import { supabaseApiService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import type { Application } from '@shared/models/application.model';
import { FINANCE_ACTIVE_BOOK_STATUSES, formatCurrency, formatDate } from '@shared/utils';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import { toast } from 'react-toastify';

const PAGE_SIZE = 100;

type ScheduleAgg = {
  remaining: number;
  nextDue: string | null;
  nextAmount: number | null;
};

type BookRow = Application & {
  remainingPrincipal?: number;
  nextDueDate?: string | null;
  nextInstallmentAmount?: number | null;
};

export const ActiveBookPage: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<BookRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await supabaseApiService.getApplications({
        skipCache: true,
        lean: true,
        statusIn: [...FINANCE_ACTIVE_BOOK_STATUSES],
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (res.status !== 'SUCCESS' || !res.data) {
        throw new Error(res.message || 'Failed to load active book');
      }

      const list = res.data;
      const ids = list.map((a) => a.id).filter(Boolean);
      const aggByApp: Record<string, ScheduleAgg> = {};

      if (ids.length > 0) {
        const { data: schedules, error } = await supabase
          .from('payment_schedules')
          .select('application_id, due_date, amount, status, remaining_amount')
          .in('application_id', ids);
        if (error) throw error;

        for (const row of schedules || []) {
          const appId = String(row.application_id || '');
          if (!appId) continue;
          if (!aggByApp[appId]) {
            aggByApp[appId] = { remaining: 0, nextDue: null, nextAmount: null };
          }
          const status = String(row.status || '').toLowerCase();
          const remaining = Number(row.remaining_amount);
          if (Number.isFinite(remaining) && status !== 'paid') {
            aggByApp[appId].remaining += remaining;
          } else if (!Number.isFinite(remaining) && status !== 'paid') {
            aggByApp[appId].remaining += Number(row.amount) || 0;
          }
          if (status !== 'paid' && row.due_date) {
            const due = String(row.due_date);
            if (!aggByApp[appId].nextDue || due < aggByApp[appId].nextDue!) {
              aggByApp[appId].nextDue = due;
              aggByApp[appId].nextAmount = Number(row.amount) || 0;
            }
          }
        }
      }

      setApps(
        list.map((a) => ({
          ...a,
          remainingPrincipal: aggByApp[a.id]?.remaining ?? 0,
          nextDueDate: aggByApp[a.id]?.nextDue ?? null,
          nextInstallmentAmount: aggByApp[a.id]?.nextAmount ?? null,
        }))
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load active book';
      setLoadError(message);
      setApps([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!searchTerm) return apps;
    const q = searchTerm.toLowerCase();
    return apps.filter(
      (app) =>
        app.customerName?.toLowerCase().includes(q) ||
        app.customerEmail?.toLowerCase().includes(q) ||
        app.id?.toLowerCase().includes(q)
    );
  }, [apps, searchTerm]);

  const columns: Column<BookRow>[] = [
    {
      id: 'id',
      label: 'Application',
      format: (value) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {String(value || '').slice(0, 12)}…
        </Typography>
      ),
    },
    {
      id: 'customerName',
      label: 'Customer',
      format: (_v, row) => row.customerName || '—',
    },
    {
      id: 'company',
      label: 'Dealership',
      format: (_v, row) =>
        row.company?.name ? <Chip size="small" label={row.company.name} variant="outlined" /> : '—',
    },
    {
      id: 'vehicle',
      label: 'Vehicle',
      format: (_v, row) =>
        row.vehicle ? `${row.vehicle.make || ''} ${row.vehicle.model || ''}`.trim() : '—',
    },
    {
      id: 'remainingPrincipal',
      label: 'Remaining',
      format: (_v, row) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(row.remainingPrincipal) || 0)}
        </Typography>
      ),
    },
    {
      id: 'nextDueDate',
      label: 'Next installment',
      format: (_v, row) => {
        if (!row.nextDueDate) return '—';
        const amt = row.nextInstallmentAmount
          ? ` · ${formatCurrency(row.nextInstallmentAmount)}`
          : '';
        return `${formatDate(row.nextDueDate)}${amt}`;
      },
    },
    {
      id: 'status',
      label: 'Status',
      format: (value) => <StatusBadge status={String(value)} type="application" />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Active Book
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Active financing with remaining balance and next installment.
      </Typography>
      <Card sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search…" />
        <Button variant="secondary" onClick={() => load()}>
          Refresh
        </Button>
      </Card>
      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : loadError ? (
        <EmptyState title="Failed to load" message={loadError} actionLabel="Retry" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No active financing" message="Activated applications will appear here." />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          onRowClick={(row) =>
            navigate(withPortalBase(portalBase, `/applications/view/${row.id}`))
          }
        />
      )}
    </Box>
  );
};
