import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import { supabaseApiService } from '@shared/services';
import type { PartnerHubSummary } from '@shared/models';
import { Button, Table, type Column, EmptyState, TableSkeleton, Input, Select } from '@shared/components';
import { toast } from 'react-toastify';
import './CompaniesPage.scss';

type CompanyFormState = {
  name: string;
  code: string;
  description: string;
  canPay: boolean;
  status: 'active' | 'inactive';
};

const emptyForm: CompanyFormState = {
  name: '',
  code: '',
  description: '',
  canPay: true,
  status: 'active',
};

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerHubSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyFormState>(emptyForm);

  const loadPartners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supabaseApiService.getPartnerHubSummaries();
      if (res.status === 'SUCCESS' && res.data) {
        setPartners(res.data);
      } else {
        throw new Error(res.message || 'Failed to load partners');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load partners';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const columns: Column<PartnerHubSummary>[] = useMemo(
    () => [
      { id: 'name', label: 'Partner', minWidth: 180 },
      { id: 'code', label: 'Code', minWidth: 90, format: (v) => v || '—' },
      {
        id: 'vehicleCount',
        label: 'Vehicles',
        minWidth: 90,
        format: (v) => String(v ?? 0),
      },
      {
        id: 'openApplicationCount',
        label: 'Open apps',
        minWidth: 90,
        format: (v) => String(v ?? 0),
      },
      {
        id: 'dealerAgentCount',
        label: 'Agents',
        minWidth: 80,
        format: (v) => String(v ?? 0),
      },
      {
        id: 'creditOfficerCount',
        label: 'Credit',
        minWidth: 80,
        format: (v) => String(v ?? 0),
      },
      {
        id: 'canPay',
        label: 'Pay',
        minWidth: 90,
        format: (v) => (
          <Chip
            size="small"
            label={v ? 'Enabled' : 'Off'}
            color={v ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        id: 'status',
        label: 'Status',
        minWidth: 100,
        format: (v) => (v === 'inactive' ? 'Inactive' : 'Active'),
      },
    ],
    []
  );

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    try {
      setSaving(true);
      if (!form.name.trim()) {
        toast.error('Partner name is required');
        return;
      }
      const res = await supabaseApiService.createCompany({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        canPay: form.canPay,
        status: form.status,
        metadata: {},
      });
      if (res.status !== 'SUCCESS') {
        throw new Error(res.message || 'Failed to create partner');
      }
      toast.success('Partner created');
      setCreateOpen(false);
      await loadPartners();
      if (res.data?.id) {
        navigate(`/admin/companies/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create partner';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="companies-page">
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Partner Hub
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            {partners.length} partners · inventory, people, and credit pipeline at a glance
          </Typography>
        </Box>
        <Box className="header-actions">
          <Button variant="secondary" onClick={loadPartners} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" onClick={openCreate}>
            Create Partner
          </Button>
        </Box>
      </Box>

      <Paper className="table-section" elevation={0}>
        {loading && partners.length === 0 ? (
          <TableSkeleton rows={6} columns={8} />
        ) : !loading && partners.length === 0 ? (
          <EmptyState
            title="No partners yet"
            message="Create a partner company to own inventory and credit staff."
            actionLabel="Create Partner"
            onAction={openCreate}
          />
        ) : (
          <Table
            columns={columns}
            rows={partners}
            loading={loading}
            onRowClick={(row) => navigate(`/admin/companies/${row.id}`)}
          />
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Partner</DialogTitle>
        <DialogContent className="company-dialog-form">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Code (optional)"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          />
          <Input
            label="Description (optional)"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((p) => ({ ...p, status: e.target.value as CompanyFormState['status'] }))
            }
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={form.canPay}
                onChange={(e) => setForm((p) => ({ ...p, canPay: e.target.checked }))}
              />
            }
            label="Payments enabled (canPay)"
          />
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitCreate} loading={saving}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
