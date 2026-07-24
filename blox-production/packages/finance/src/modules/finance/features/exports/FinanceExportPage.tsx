import React, { useCallback, useState } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { Button, Card } from '@shared/components';
import { supabase } from '@shared/services/supabase.service';
import { toast } from 'react-toastify';

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read-only operational CSV export (schedules + ledgers).
 * Not a full GL / accounting system — no SkipCash or settlement math changes.
 */
export const FinanceExportPage: React.FC = () => {
  const [exportingSchedules, setExportingSchedules] = useState(false);
  const [exportingLedgers, setExportingLedgers] = useState(false);

  const exportSchedules = useCallback(async () => {
    try {
      setExportingSchedules(true);
      const { data, error } = await supabase
        .from('payment_schedules')
        .select(
          'id, application_id, due_date, amount, status, paid_amount, remaining_amount, paid_date'
        )
        .order('due_date', { ascending: true })
        .limit(5000);
      if (error) throw error;
      const headers = [
        'id',
        'application_id',
        'due_date',
        'amount',
        'status',
        'paid_amount',
        'remaining_amount',
        'paid_date',
      ];
      downloadCsv(
        `blox-payment-schedules-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(headers, (data || []) as Record<string, unknown>[])
      );
      toast.success(`Exported ${(data || []).length} schedule rows`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Schedule export failed');
    } finally {
      setExportingSchedules(false);
    }
  }, []);

  const exportLedgers = useCallback(async () => {
    try {
      setExportingLedgers(true);
      const { data, error } = await supabase
        .from('ledgers')
        .select('id, application_id, transaction_type, amount, description, date, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const headers = [
        'id',
        'application_id',
        'transaction_type',
        'amount',
        'description',
        'date',
        'status',
        'created_at',
      ];
      downloadCsv(
        `blox-ledgers-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(headers, (data || []) as Record<string, unknown>[])
      );
      toast.success(`Exported ${(data || []).length} ledger rows`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ledger export failed');
    } finally {
      setExportingLedgers(false);
    }
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Exports
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Download operational CSVs for finance review. This is not a full general ledger.
      </Typography>
      <Stack spacing={2} maxWidth={560}>
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Payment schedules
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Due dates, amounts, paid/remaining (up to 5,000 rows).
          </Typography>
          <Button variant="primary" onClick={exportSchedules} loading={exportingSchedules}>
            Download schedules CSV
          </Button>
        </Card>
        <Card sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ledgers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Application ledger entries already written by payment flows (up to 5,000 rows).
          </Typography>
          <Button variant="primary" onClick={exportLedgers} loading={exportingLedgers}>
            Download ledgers CSV
          </Button>
        </Card>
      </Stack>
    </Box>
  );
};
