import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  FormControlLabel,
  Switch,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { supabaseApiService } from '@shared/services';
import type { Application, Company, Product, User } from '@shared/models';
import {
  Button,
  EmptyState,
  Input,
  Select,
  StatusBadge,
  Table,
  TableSkeleton,
  type Column,
} from '@shared/components';
import { formatCurrency, formatProductDisplayTitle } from '@shared/utils';
import { CREDIT_PIPELINE_STATUSES } from '@shared/utils/application-status-transitions';
import { toast } from 'react-toastify';
import './PartnerDetailPage.scss';

type PartnerTab = 'overview' | 'vehicles' | 'people' | 'applications';

type CompanyFormState = {
  name: string;
  code: string;
  description: string;
  canPay: boolean;
  status: 'active' | 'inactive';
};

export const PartnerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<PartnerTab>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormState | null>(null);
  const [vehicles, setVehicles] = useState<Product[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [assignedOfficers, setAssignedOfficers] = useState<User[]>([]);
  const [allOfficers, setAllOfficers] = useState<User[]>([]);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([]);
  const [allFinanceOfficers, setAllFinanceOfficers] = useState<User[]>([]);
  const [selectedFinanceOfficerIds, setSelectedFinanceOfficerIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savingOfficers, setSavingOfficers] = useState(false);
  const [savingFinanceOfficers, setSavingFinanceOfficers] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [
        companyRes,
        productsRes,
        usersRes,
        officersRes,
        assignedRes,
        financeOfficersRes,
        assignedFinanceRes,
        appsRes,
      ] = await Promise.all([
          supabaseApiService.getCompanyById(id),
          supabaseApiService.getProductsByCompanyId(id),
          supabaseApiService.getUsersByCompanyId(id),
          supabaseApiService.getCreditOfficers(),
          supabaseApiService.getCreditOfficersForCompany(id),
          supabaseApiService.getFinanceOfficers(),
          supabaseApiService.getFinanceOfficersForCompany(id),
          supabaseApiService.getApplications({
            companyId: id,
            lean: true,
            skipCache: true,
            limit: 100,
          }),
        ]);

      if (companyRes.status !== 'SUCCESS' || !companyRes.data?.id) {
        throw new Error(companyRes.message || 'Partner not found');
      }

      const c = companyRes.data;
      setCompany(c);
      setForm({
        name: c.name || '',
        code: c.code || '',
        description: c.description || '',
        canPay: Boolean(c.canPay),
        status: c.status || 'active',
      });
      setVehicles(productsRes.data || []);
      setAgents((usersRes.data || []).filter((u) => (u.role || '').toLowerCase() === 'dealer_agent'));
      setAllOfficers(officersRes.data || []);
      setAssignedOfficers(assignedRes.data || []);
      setSelectedOfficerIds((assignedRes.data || []).map((u) => u.id));
      setAllFinanceOfficers(financeOfficersRes.data || []);
      setSelectedFinanceOfficerIds((assignedFinanceRes.data || []).map((u) => u.id));
      setApplications(appsRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load partner';
      toast.error(msg);
      navigate('/admin/companies');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const openApps = useMemo(
    () =>
      applications.filter((a) =>
        (CREDIT_PIPELINE_STATUSES as readonly string[]).includes(a.status)
      ),
    [applications]
  );

  const saveCompany = async () => {
    if (!id || !form) return;
    try {
      setSaving(true);
      if (!form.name.trim()) {
        toast.error('Company name is required');
        return;
      }
      const res = await supabaseApiService.updateCompany(id, {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        canPay: form.canPay,
        status: form.status,
      });
      if (res.status !== 'SUCCESS') {
        throw new Error(res.message || 'Failed to update partner');
      }
      toast.success('Partner updated');
      setCompany(res.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update partner');
    } finally {
      setSaving(false);
    }
  };

  const saveOfficers = async () => {
    if (!id) return;
    try {
      setSavingOfficers(true);
      const res = await supabaseApiService.setCompanyCreditOfficers(id, selectedOfficerIds);
      if (res.status !== 'SUCCESS') {
        throw new Error(res.message || 'Failed to update credit officers');
      }
      toast.success('Credit officer assignments saved');
      const assignedRes = await supabaseApiService.getCreditOfficersForCompany(id);
      setAssignedOfficers(assignedRes.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assignments');
    } finally {
      setSavingOfficers(false);
    }
  };

  const saveFinanceOfficers = async () => {
    if (!id) return;
    try {
      setSavingFinanceOfficers(true);
      const res = await supabaseApiService.setCompanyFinanceOfficers(
        id,
        selectedFinanceOfficerIds
      );
      if (res.status !== 'SUCCESS') {
        throw new Error(res.message || 'Failed to update finance officers');
      }
      toast.success('Finance officer assignments saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save finance assignments');
    } finally {
      setSavingFinanceOfficers(false);
    }
  };

  const toggleOfficer = (userId: string) => {
    setSelectedOfficerIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    );
  };

  const toggleFinanceOfficer = (userId: string) => {
    setSelectedFinanceOfficerIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    );
  };

  const vehicleColumns: Column<Product>[] = useMemo(
    () => [
      {
        id: 'make',
        label: 'Vehicle',
        minWidth: 220,
        format: (_v, row) => formatProductDisplayTitle(row),
      },
      { id: 'modelYear', label: 'Year', minWidth: 80 },
      {
        id: 'price',
        label: 'Price',
        minWidth: 120,
        format: (v) => formatCurrency(Number(v) || 0),
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

  const appColumns: Column<Application>[] = useMemo(
    () => [
      { id: 'customerName', label: 'Customer', minWidth: 160 },
      {
        id: 'status',
        label: 'Status',
        minWidth: 140,
        format: (v) => <StatusBadge status={String(v)} type="application" />,
      },
      {
        id: 'vehicle',
        label: 'Vehicle',
        minWidth: 180,
        format: (_v, row) =>
          row.vehicle ? formatProductDisplayTitle(row.vehicle) : '—',
      },
      {
        id: 'createdAt',
        label: 'Created',
        minWidth: 120,
        format: (v) => (v ? new Date(String(v)).toLocaleDateString() : '—'),
      },
    ],
    []
  );

  if (loading || !company || !form) {
    return (
      <Box className="partner-detail-page">
        <TableSkeleton rows={6} columns={4} />
      </Box>
    );
  }

  return (
    <Box className="partner-detail-page">
      <Box className="page-header">
        <Box>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/companies')}
            startIcon={<ArrowBack />}
          >
            Partner Hub
          </Button>
          <Typography variant="h2" className="page-title">
            {company.name}
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            {company.code || 'No code'} · {company.status}
            {company.canPay ? ' · Payments enabled' : ' · Payments disabled'}
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v: PartnerTab) => setTab(v)}
        className="partner-tabs"
      >
        <Tab value="overview" label="Overview" />
        <Tab value="vehicles" label={`Vehicles (${vehicles.length})`} />
        <Tab value="people" label="People" />
        <Tab value="applications" label={`Applications (${applications.length})`} />
      </Tabs>

      {tab === 'overview' && (
        <Box className="partner-tab-panel">
          <Box className="kpi-grid">
            <Paper className="kpi-card" elevation={0}>
              <Typography variant="caption">Active inventory</Typography>
              <Typography variant="h3">
                {vehicles.filter((v) => v.status === 'active').length}
              </Typography>
            </Paper>
            <Paper className="kpi-card" elevation={0}>
              <Typography variant="caption">Open credit apps</Typography>
              <Typography variant="h3">{openApps.length}</Typography>
            </Paper>
            <Paper className="kpi-card" elevation={0}>
              <Typography variant="caption">Dealer agents</Typography>
              <Typography variant="h3">{agents.length}</Typography>
            </Paper>
            <Paper className="kpi-card" elevation={0}>
              <Typography variant="caption">Credit officers</Typography>
              <Typography variant="h3">{assignedOfficers.length}</Typography>
            </Paper>
          </Box>

          <Paper className="form-section" elevation={0}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Partner settings
            </Typography>
            <Box className="company-form">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
              />
              <Input
                label="Code"
                value={form.code}
                onChange={(e) => setForm((p) => (p ? { ...p, code: e.target.value } : p))}
              />
              <Input
                label="Description"
                multiline
                minRows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, description: e.target.value } : p))
                }
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) =>
                  setForm((p) =>
                    p ? { ...p, status: e.target.value as CompanyFormState['status'] } : p
                  )
                }
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.canPay}
                    onChange={(e) =>
                      setForm((p) => (p ? { ...p, canPay: e.target.checked } : p))
                    }
                  />
                }
                label="Payments enabled (canPay)"
              />
              <Box>
                <Button variant="primary" onClick={saveCompany} loading={saving}>
                  Save settings
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {tab === 'vehicles' && (
        <Paper className="table-section" elevation={0}>
          {vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles"
              message="This partner has no inventory yet."
            />
          ) : (
            <Table
              columns={vehicleColumns}
              rows={vehicles}
              onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
            />
          )}
        </Paper>
      )}

      {tab === 'people' && (
        <Box className="partner-tab-panel people-panel">
          <Paper className="form-section" elevation={0}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Dealer agents
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Users with role dealer_agent and company_id = this partner.
            </Typography>
            {agents.length === 0 ? (
              <EmptyState
                title="No dealer agents"
                message="Create a dealer_agent user and assign this company from Users."
              />
            ) : (
              <List dense>
                {agents.map((u) => (
                  <ListItem
                    key={u.id}
                    secondaryAction={
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(`/admin/users/${encodeURIComponent(u.email)}`)
                        }
                      >
                        Open
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={u.name || u.email}
                      secondary={u.email}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper className="form-section" elevation={0}>
            <Box className="people-header">
              <Box>
                <Typography variant="h6">Assigned credit officers</Typography>
                <Typography variant="body2" color="text.secondary">
                  Officers see only this partner&apos;s applications (unless scope = all).
                </Typography>
              </Box>
              <Button
                variant="primary"
                onClick={saveOfficers}
                loading={savingOfficers}
              >
                Save assignments
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            {allOfficers.length === 0 ? (
              <EmptyState
                title="No credit officers"
                message="Create credit_officer users first, then assign them here."
              />
            ) : (
              <List dense>
                {allOfficers.map((u) => {
                  const checked = selectedOfficerIds.includes(u.id);
                  const scope = u.creditScope || 'assigned';
                  return (
                    <ListItem key={u.id} disablePadding>
                      <ListItemButton onClick={() => toggleOfficer(u.id)} dense>
                        <ListItemIcon>
                          <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                        </ListItemIcon>
                        <ListItemText
                          primary={u.name || u.email}
                          secondary={u.email}
                        />
                        <Chip
                          size="small"
                          label={scope === 'all' ? 'scope: all' : 'scope: assigned'}
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>

          <Paper className="form-section" elevation={0}>
            <Box className="people-header">
              <Box>
                <Typography variant="h6">Assigned finance officers</Typography>
                <Typography variant="body2" color="text.secondary">
                  Officers with scope = assigned see only this partner&apos;s book. Default scope is
                  all (platform-wide).
                </Typography>
              </Box>
              <Button
                variant="primary"
                onClick={saveFinanceOfficers}
                loading={savingFinanceOfficers}
              >
                Save finance assignments
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            {allFinanceOfficers.length === 0 ? (
              <EmptyState
                title="No finance officers"
                message="Create finance_officer users first, then assign them here."
              />
            ) : (
              <List dense>
                {allFinanceOfficers.map((u) => {
                  const checked = selectedFinanceOfficerIds.includes(u.id);
                  const scope = u.financeScope || 'all';
                  return (
                    <ListItem key={u.id} disablePadding>
                      <ListItemButton onClick={() => toggleFinanceOfficer(u.id)} dense>
                        <ListItemIcon>
                          <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                        </ListItemIcon>
                        <ListItemText
                          primary={u.name || u.email}
                          secondary={u.email}
                        />
                        <Chip
                          size="small"
                          label={scope === 'all' ? 'scope: all' : 'scope: assigned'}
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Box>
      )}

      {tab === 'applications' && (
        <Paper className="table-section" elevation={0}>
          {applications.length === 0 ? (
            <EmptyState
              title="No applications"
              message="Applications for this partner will appear here."
            />
          ) : (
            <Table
              columns={appColumns}
              rows={applications}
              onRowClick={(row) => navigate(`/admin/applications/view/${row.id}`)}
            />
          )}
        </Paper>
      )}
    </Box>
  );
};
