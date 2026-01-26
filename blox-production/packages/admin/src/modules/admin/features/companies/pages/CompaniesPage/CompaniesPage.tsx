import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
} from '@mui/material';
import { supabaseApiService } from '@shared/services';
import type { Company } from '@shared/models';
import { Button, Table, type Column, Loading, ConfirmDialog } from '@shared/components';
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyFormState>(emptyForm);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supabaseApiService.getCompanies();
      if (res.status === 'SUCCESS' && res.data) {
        setCompanies(res.data);
      } else {
        throw new Error(res.message || 'Failed to load companies');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load companies';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const columns: Column<Company>[] = useMemo(() => [
    { id: 'name', label: 'Name', minWidth: 220 },
    { id: 'code', label: 'Code', minWidth: 120, format: (v) => v || '-' },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      format: (v) => (v === 'inactive' ? 'Inactive' : 'Active'),
    },
    {
      id: 'canPay',
      label: 'Can Pay',
      minWidth: 120,
      format: (v) => (v ? 'Enabled' : 'Disabled'),
    },
  ], []);

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditingCompanyId(company.id);
    setForm({
      name: company.name || '',
      code: company.code || '',
      description: company.description || '',
      canPay: Boolean(company.canPay),
      status: company.status || 'active',
    });
    setEditOpen(true);
  };

  const submitCreate = async () => {
    try {
      setSaving(true);
      if (!form.name.trim()) {
        toast.error('Company name is required');
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
        throw new Error(res.message || 'Failed to create company');
      }
      toast.success('Company created');
      setCreateOpen(false);
      await loadCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create company';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editingCompanyId) return;
    try {
      setSaving(true);
      if (!form.name.trim()) {
        toast.error('Company name is required');
        return;
      }
      const res = await supabaseApiService.updateCompany(editingCompanyId, {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        canPay: form.canPay,
        status: form.status,
      });
      if (res.status !== 'SUCCESS') {
        throw new Error(res.message || 'Failed to update company');
      }
      toast.success('Company updated');
      setEditOpen(false);
      setEditingCompanyId(null);
      await loadCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update company';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete is optional; keep a confirm dialog but we don't have a deleteCompany API yet.
  const requestDelete = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteOpen(true);
  };

  if (loading && companies.length === 0) {
    return <Loading fullScreen message="Loading companies..." />;
  }

  return (
    <Box className="companies-page">
      <Box className="page-header">
        <Typography variant="h2">Companies</Typography>
        <Box className="header-actions">
          <Button variant="secondary" onClick={loadCompanies}>
            Refresh
          </Button>
          <Button variant="primary" onClick={openCreate}>
            Create Company
          </Button>
        </Box>
      </Box>

      <Paper className="table-section">
        <Table
          columns={columns}
          rows={companies}
          loading={loading}
          onRowClick={(row) => openEdit(row)}
          emptyMessage="No companies yet. Click “Create Company” to add one."
        />
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Company</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Code (optional)"
            fullWidth
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Status"
            select
            fullWidth
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CompanyFormState['status'] }))}
            sx={{ mt: 2 }}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Company</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Code (optional)"
            fullWidth
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Status"
            select
            fullWidth
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CompanyFormState['status'] }))}
            sx={{ mt: 2 }}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
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
          <Button
            variant="secondary"
            onClick={() => {
              if (companies.length && editingCompanyId) {
                const c = companies.find((x) => x.id === editingCompanyId);
                if (c) requestDelete(c);
              }
            }}
            disabled
          >
            Delete (coming soon)
          </Button>
          <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
            Close
          </Button>
          <Button variant="primary" onClick={submitEdit} loading={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Company"
        message={`Delete "${companyToDelete?.name}"? This is not implemented yet.`}
        confirmText="OK"
        cancelText="Close"
        onConfirm={() => setDeleteOpen(false)}
        onCancel={() => setDeleteOpen(false)}
      />
    </Box>
  );
};

