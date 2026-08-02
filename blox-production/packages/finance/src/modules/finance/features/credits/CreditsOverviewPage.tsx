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
import { creditsService, supabaseApiService } from '@shared/services';
import { formatCurrency, formatDate } from '@shared/utils';
import {
  ManageCreditsDialog,
  type CreditsAction,
} from '@admin-module/features/users/components/ManageCreditsDialog';
import { toast } from 'react-toastify';

type CreditRow = {
  user_email: string;
  balance: number | null;
  updated_at: string | null;
};

/** Blox Credits balances with finance adjust (add / subtract / set). */
export const CreditsOverviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CreditRow | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleManageCredits = async (
    action: CreditsAction,
    amount: number,
    description: string
  ) => {
    if (!selected?.user_email) return;
    try {
      setSaving(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const actorEmail = authUser?.email || undefined;

      let result;
      switch (action) {
        case 'add':
          result = await creditsService.addCredits(
            selected.user_email,
            amount,
            description,
            actorEmail
          );
          break;
        case 'subtract':
          result = await creditsService.subtractCredits(
            selected.user_email,
            amount,
            description,
            actorEmail
          );
          break;
        case 'set':
          result = await creditsService.setCredits(
            selected.user_email,
            amount,
            description,
            actorEmail
          );
          break;
      }

      if (result.status === 'SUCCESS') {
        toast.success(result.data?.message || 'Credits updated');
        void supabaseApiService
          .notifyRoles(['admin', 'super_admin'], {
            type: 'info',
            title: 'Credits adjusted',
            message: `${action} ${amount} for ${selected.user_email}${description ? ` — ${description}` : ''}`,
            link: '/users',
          })
          .catch((err) => console.error('Failed to notify staff:', err));
        await load();
      } else {
        throw new Error(result.message || 'Failed to update credits');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update credits');
      throw e;
    } finally {
      setSaving(false);
    }
  };

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
    {
      id: 'updated_at',
      label: 'Actions',
      format: (_v, row) => (
        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
            setDialogOpen(true);
          }}
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <Box className="finance-overview-page">
      <Typography variant="h2" sx={{ mb: 1 }}>
        Customer credits
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View and adjust Blox Credits balances (add, subtract, or set).
      </Typography>
      <Card sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search email…" />
        <Button variant="secondary" onClick={() => load()}>
          Refresh
        </Button>
      </Card>
      {loading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : loadError ? (
        <EmptyState title="Failed to load" message={loadError} actionLabel="Retry" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No credit balances" message="Customer credit balances will appear here." />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}

      {selected && (
        <ManageCreditsDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelected(null);
          }}
          onSave={handleManageCredits}
          userEmail={selected.user_email}
          currentBalance={Number(selected.balance) || 0}
          loading={saving}
        />
      )}
    </Box>
  );
};
