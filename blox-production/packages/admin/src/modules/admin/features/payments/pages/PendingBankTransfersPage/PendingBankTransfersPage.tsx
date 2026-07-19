import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button as MuiButton, Alert } from '@mui/material';
import { Refresh, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseApiService } from '@shared/services';
import { Table, type Column, Button, EmptyState, TableSkeleton } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';

type PendingTxn = {
  id: string;
  transaction_id: string;
  application_id: string;
  amount: number;
  status: string;
  method: string;
  failure_reason: string | null;
  created_at?: string;
};

function parseMeta(failureReason: string | null): {
  dueDate?: string;
  isSettlement?: boolean;
  reference?: string;
} {
  if (!failureReason) return {};
  try {
    return JSON.parse(failureReason);
  } catch {
    const m = failureReason.match(/due\s+(\d{4}-\d{2}-\d{2}|settlement)/i);
    const ref = failureReason.match(/ref\s+([^)]+)/i);
    return {
      dueDate: m?.[1],
      isSettlement: m?.[1] === 'settlement',
      reference: ref?.[1]?.trim(),
    };
  }
}

export const PendingBankTransfersPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PendingTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from('payment_transactions')
        .select('id, transaction_id, application_id, amount, status, method, failure_reason, created_at')
        .eq('method', 'bank_transfer')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (qErr) {
        throw new Error(qErr.message);
      }
      setRows((data || []) as PendingTxn[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load pending bank transfers';
      setError(msg);
      setRows([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async (txn: PendingTxn) => {
    try {
      setConfirmingId(txn.transaction_id);
      const result = await supabaseApiService.confirmPendingBankTransfer(txn.transaction_id);
      if (result.status !== 'SUCCESS') {
        throw new Error(result.message || 'Confirmation failed');
      }
      toast.success('Bank transfer confirmed — installment marked paid');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Confirmation failed');
    } finally {
      setConfirmingId(null);
    }
  };

  const columns: Column<PendingTxn>[] = [
    {
      id: 'transaction_id',
      label: 'Transaction',
      minWidth: 160,
      format: (v) => String(v).slice(0, 18) + (String(v).length > 18 ? '…' : ''),
    },
    {
      id: 'application_id',
      label: 'Application',
      minWidth: 120,
      format: (_v, row) => (
        <MuiButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/applications/view/${row.application_id}`);
          }}
        >
          {row.application_id?.slice(0, 8)}…
        </MuiButton>
      ),
    },
    {
      id: 'amount',
      label: 'Amount',
      minWidth: 100,
      format: (v) => formatCurrency(Number(v) || 0),
    },
    {
      id: 'failure_reason',
      label: 'Details',
      minWidth: 180,
      format: (_v, row) => {
        const meta = parseMeta(row.failure_reason);
        if (meta.isSettlement || meta.dueDate === 'settlement') return 'Settlement';
        if (meta.dueDate) return `Due ${meta.dueDate}${meta.reference ? ` · ${meta.reference}` : ''}`;
        return meta.reference || '—';
      },
    },
    {
      id: 'created_at',
      label: 'Submitted',
      minWidth: 140,
      format: (v) => (v ? new Date(String(v)).toLocaleString() : '—'),
    },
    {
      id: 'id',
      label: 'Action',
      minWidth: 140,
      format: (_v, row) => (
        <Button
          variant="primary"
          startIcon={<CheckCircle />}
          loading={confirmingId === row.transaction_id}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleConfirm(row);
          }}
        >
          Confirm
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--primary-text)' }}>
            Pending Bank Transfers
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--secondary-text)', mt: 0.5 }}>
            Confirm customer bank transfers to mark installments paid (dual-write schedules).
          </Typography>
        </Box>
        <Button variant="secondary" startIcon={<Refresh />} onClick={() => load()}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={error ? 'Could not load transfers' : 'No pending bank transfers'}
          message={
            error
              ? 'Fix the error above and refresh.'
              : 'When customers submit bank transfers, they appear here for confirmation.'
          }
        />
      ) : (
        <Table columns={columns} rows={rows} />
      )}
    </Box>
  );
};
