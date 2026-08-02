import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
import { supabaseApiService } from '@shared/services';
import { formatCurrency, formatDate } from '@shared/utils';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import { toast } from 'react-toastify';

type SettlementRow = {
  id: string;
  application_id: string | null;
  status: string | null;
  settlement_amount: number | null;
  remaining_principal: number | null;
  forgiven_rent: number | null;
  customer_email: string | null;
  requested_at: string | null;
  approved_at: string | null;
};

function isPendingStatus(status: string | null): boolean {
  const s = (status || '').toLowerCase();
  return s === 'pending' || s === 'requested' || s === 'submitted';
}

/** Settlement requests with finance approve/reject. */
export const SettlementsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('application_settlements')
        .select(
          'id, application_id, status, settlement_amount, remaining_principal, forgiven_rent, customer_email, requested_at, approved_at'
        )
        .order('requested_at', { ascending: false })
        .limit(150);
      if (error) throw error;
      setRows((data || []) as SettlementRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load settlements';
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

  const handleUpdate = async (id: string, status: 'approved' | 'rejected') => {
    const verb = status === 'approved' ? 'Approve' : 'Reject';
    if (!window.confirm(`${verb} this settlement request?`)) return;
    try {
      setActingId(id);
      const res = await supabaseApiService.updateSettlementStatus(id, status);
      if (res.status !== 'SUCCESS') {
        throw new Error(res.message || `Failed to ${status} settlement`);
      }
      toast.success(`Settlement ${status}`);
      void supabaseApiService
        .notifyRoles(['admin', 'super_admin'], {
          type: status === 'approved' ? 'success' : 'warning',
          title: `Settlement ${status}`,
          message: `Settlement ${id.slice(0, 8)} was ${status}.`,
          // Admin portal relative (recipients are admin/super_admin)
          link: '/applications',
        })
        .catch((err) => console.error('Failed to notify staff:', err));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${status} settlement`);
    } finally {
      setActingId(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.application_id?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q)
    );
  });

  const columns: Column<SettlementRow>[] = [
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
      id: 'customer_email',
      label: 'Customer',
      format: (v) => String(v || '—'),
    },
    {
      id: 'status',
      label: 'Status',
      format: (v) => <Chip size="small" label={String(v || '—')} variant="outlined" />,
    },
    {
      id: 'settlement_amount',
      label: 'Settlement',
      format: (v) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(v) || 0)}
        </Typography>
      ),
    },
    {
      id: 'remaining_principal',
      label: 'Principal left',
      format: (v) => (
        <Typography variant="body2" className="blox-numeric">
          {formatCurrency(Number(v) || 0)}
        </Typography>
      ),
    },
    {
      id: 'requested_at',
      label: 'Requested',
      format: (v) => (v ? formatDate(String(v)) : '—'),
    },
    {
      id: 'id',
      label: 'Actions',
      format: (_v, row) =>
        isPendingStatus(row.status) ? (
          <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="primary"
              disabled={actingId === row.id}
              onClick={() => handleUpdate(row.id, 'approved')}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              disabled={actingId === row.id}
              onClick={() => handleUpdate(row.id, 'rejected')}
            >
              Reject
            </Button>
          </Box>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <Box className="finance-overview-page">
      <Typography variant="h2" sx={{ mb: 1 }}>
        Settlements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review settlement requests. Approve or reject pending items. Discount settings remain
        admin-only.
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
        <EmptyState title="No settlements" message="Settlement requests will appear here." />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
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
