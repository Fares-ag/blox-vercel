import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import {
  AttachMoney,
  AccountBalance,
  TrendingUp,
  People,
  Visibility,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading, setError, setPage, setLimit } from '../../../../store/slices/applications.slice';
import { supabaseApiService } from '@shared/services';
import type { Application, ApplicationStatus } from '@shared/models/application.model';
import {
  Table,
  type Column,
  Button,
  StatusBadge,
  SearchBar,
  Card,
  EmptyState,
  FilterPanel,
  type FilterConfig,
  TableSkeleton,
} from '@shared/components';
import { toast } from 'react-toastify';
import './ApplicationsListPage.scss';

type StatusFilter = 'all' | 'inprogress' | 'active' | 'rejected' | 'completed' | 'cancelled';

type ScheduleHealth = 'on_track' | 'overdue' | 'none';

const getOverdueCount = (app: Application): number => {
  const schedule = app.installmentPlan?.schedule || [];
  const now = Date.now();
  return schedule.filter((p) => {
    if (p.status === 'paid') return false;
    return new Date(p.dueDate).getTime() < now;
  }).length;
};

const getScheduleHealth = (app: Application): ScheduleHealth => {
  const schedule = app.installmentPlan?.schedule || [];
  if (schedule.length === 0) return 'none';
  return getOverdueCount(app) > 0 ? 'overdue' : 'on_track';
};

const brandChip = {
  onTrack: {
    bg: 'rgba(218, 255, 1, 0.22)',
    fg: 'var(--blox-black)',
    border: '1px solid var(--blox-black)',
  },
  overdue: {
    bg: 'var(--light-grey)',
    fg: 'var(--blox-black)',
    border: '1px solid var(--blox-black)',
  },
  high: {
    bg: 'var(--blox-black)',
    fg: 'var(--light-grey)',
    border: '1px solid var(--blox-black)',
  },
  medium: {
    bg: 'rgba(120, 118, 99, 0.16)',
    fg: 'var(--blox-black)',
    border: '1px solid var(--dark-grey)',
  },
  low: {
    bg: 'rgba(218, 255, 1, 0.18)',
    fg: 'var(--blox-black)',
    border: '1px solid var(--blox-black)',
  },
  muted: {
    bg: 'var(--card-hover)',
    fg: 'var(--secondary-text)',
    border: '1px solid var(--divider-color)',
  },
} as const;

export const ApplicationsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading, pagination } = useAppSelector((state) => state.applications);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeTab, setActiveTab] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [fullFilteredList, setFullFilteredList] = useState<Application[]>([]);
  const [catalogApps, setCatalogApps] = useState<Application[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, unknown>>({});
  const [lastLoadTime, setLastLoadTime] = useState(Date.now());

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filterApplicationsByStatus = useCallback((applications: Application[], filter: StatusFilter): Application[] => {
    if (filter === 'all') return applications;
    if (filter === 'inprogress') {
      return applications.filter((app) => app.status === 'under_review' || app.status === 'resubmission_required');
    }
    if (filter === 'active') return applications.filter((app) => app.status === 'active');
    if (filter === 'rejected') return applications.filter((app) => app.status === 'rejected');
    if (filter === 'completed') return applications.filter((app) => app.status === 'completed');
    if (filter === 'cancelled') {
      return applications.filter((app) => app.status === 'submission_cancelled');
    }
    return applications;
  }, []);

  const loadApplications = useCallback(async (forceRefresh = false) => {
    try {
      dispatch(setLoading(true));
      
      // If force refresh, invalidate cache first
      if (forceRefresh) {
        const { supabaseCache } = await import('@shared/services/supabase-cache.service');
        supabaseCache.invalidate('applications:all');
        supabaseCache.invalidatePattern('^applications:');
        console.log('🔄 Force refreshing applications list');
      }
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let applications = supabaseResponse.data;
        
        // Apply search filter (using debounced term)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          applications = applications.filter((app: Application) =>
            app.customerName?.toLowerCase().includes(searchLower) ||
            app.customerEmail?.toLowerCase().includes(searchLower) ||
            app.id?.toLowerCase().includes(searchLower)
          );
        }
        
        setCatalogApps(applications);

        // Apply status + advanced filters
        let filtered = filterApplicationsByStatus(applications, statusFilter);

        const companyId = typeof advancedFilters.companyId === 'string' ? advancedFilters.companyId : '';
        if (companyId) {
          filtered = filtered.filter((app) => app.companyId === companyId || app.company?.id === companyId);
        }

        const scheduleHealth =
          typeof advancedFilters.scheduleHealth === 'string' ? advancedFilters.scheduleHealth : '';
        if (scheduleHealth) {
          filtered = filtered.filter((app) => getScheduleHealth(app) === scheduleHealth);
        }

        const createdRange = advancedFilters.createdRange as
          | { startDate?: string | null; endDate?: string | null }
          | undefined;
        if (createdRange?.startDate) {
          const start = new Date(createdRange.startDate).getTime();
          filtered = filtered.filter((app) => new Date(app.createdAt).getTime() >= start);
        }
        if (createdRange?.endDate) {
          const end = new Date(createdRange.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
          filtered = filtered.filter((app) => new Date(app.createdAt).getTime() <= end);
        }

        setFullFilteredList(filtered);
        
        // Pagination
        const total = filtered.length;
        const start = (pagination.page - 1) * pagination.limit;
        const end = start + pagination.limit;
        const paginatedApps = filtered.slice(start, end);
        
        dispatch(setList({ applications: paginatedApps, total }));
        setLastLoadTime(Date.now());
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load applications from Supabase');
      }
    } catch (error: any) {
      console.error('❌ Failed to load applications:', error);
      dispatch(setError(error.message || 'Failed to load applications from Supabase'));
      toast.error(error.message || 'Failed to load applications from Supabase');
    } finally {
      dispatch(setLoading(false));
    }
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearchTerm,
    statusFilter,
    advancedFilters,
    dispatch,
    filterApplicationsByStatus,
  ]);

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    catalogApps.forEach((app) => {
      const id = app.companyId || app.company?.id;
      const name = app.company?.name || app.companyId;
      if (id && name) map.set(id, name);
    });
    return [
      { value: '', label: 'All companies' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [catalogApps]);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        id: 'companyId',
        label: 'Company',
        type: 'select',
        options: companyOptions,
      },
      {
        id: 'scheduleHealth',
        label: 'Payment schedule',
        type: 'select',
        options: [
          { value: '', label: 'All schedules' },
          { value: 'on_track', label: 'On track' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'none', label: 'No schedule' },
        ],
      },
      {
        id: 'createdRange',
        label: 'Created date',
        type: 'daterange',
      },
    ],
    [companyOptions]
  );

  const handleAdvancedFiltersChange = useCallback(
    (values: Record<string, unknown>) => {
      setAdvancedFilters(values);
      dispatch(setPage(1));
    },
    [dispatch]
  );

  const handleClearAdvancedFilters = useCallback(() => {
    setAdvancedFilters({});
    dispatch(setPage(1));
  }, [dispatch]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Listen for navigation events to force refresh when coming from delete
  useEffect(() => {
    const handleFocus = () => {
      // If page was focused and it's been more than 1 second since last load, refresh
      const timeSinceLastLoad = Date.now() - lastLoadTime;
      if (timeSinceLastLoad > 1000) {
        console.log('🔄 Page focused, refreshing applications list');
        loadApplications(true);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lastLoadTime, loadApplications]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    dispatch(setPage(1));
  }, [dispatch]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const statusMap: StatusFilter[] = ['all', 'inprogress', 'active', 'rejected', 'completed', 'cancelled'];
    setStatusFilter(statusMap[newValue]);
    dispatch(setPage(1));
  }, [dispatch]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Use fullFilteredList which contains ALL matching applications (before pagination)
    // This ensures metrics reflect totals across ALL matching applications, not just current page
    const filtered = fullFilteredList;
    
    // Total Payable = sum of all unpaid installments for the filtered applications
    const totalPayable = filtered.reduce((sum, app) => {
      const schedule = app.installmentPlan?.schedule || [];
      const unpaidForApp = schedule.reduce((acc, payment) => {
        if (payment.status === 'paid') return acc;
        const amount = Number(payment.amount) || 0;
        return acc + amount;
      }, 0);
      return sum + unpaidForApp;
    }, 0);

    // Total Receivable = total loan amount for the filtered applications
    const totalReceivable = filtered.reduce((sum, app) => {
      const loanAmount = Number(app.loanAmount) || 0;
      return sum + loanAmount;
    }, 0);

    // Average Payment Size = average installment amount across all applications
    let averagePaymentSize = 0;
    let totalPaymentsCount = 0;
    let totalPaymentAmount = 0;
    
    filtered.forEach((app) => {
      const schedule = app.installmentPlan?.schedule || [];
      schedule.forEach((payment) => {
        const amount = Number(payment.amount) || 0;
        if (amount > 0) {
          totalPaymentAmount += amount;
          totalPaymentsCount += 1;
        }
      });
    });

    if (totalPaymentsCount > 0 && !isNaN(totalPaymentAmount)) {
      averagePaymentSize = totalPaymentAmount / totalPaymentsCount;
      averagePaymentSize = Math.round(averagePaymentSize * 100) / 100;
    }

    return {
      totalPayable: isNaN(totalPayable) ? 0 : totalPayable,
      totalReceivable: isNaN(totalReceivable) ? 0 : totalReceivable,
      averagePaymentSize: isNaN(averagePaymentSize) ? 0 : averagePaymentSize,
      activeApplications: filtered.filter((app) => app.status === 'active' || app.status === 'under_review').length,
    };
  }, [fullFilteredList]);

  // Calculate asset distribution percentage based on real ownership:
  // (down payment + sum of paid installments) / vehicle price
  const getAssetDistribution = (application: Application): number => {
    const vehiclePrice = application.vehicle?.price || 0;
    const downPayment = application.downPayment || application.installmentPlan?.downPayment || 0;

    let paidInstallmentsTotal = 0;
    if (application.installmentPlan?.schedule) {
      application.installmentPlan.schedule.forEach((payment) => {
        if (payment.status === 'paid') {
          paidInstallmentsTotal += payment.amount || 0;
        }
      });
    }

    const customerOwnershipAmount = downPayment + paidInstallmentsTotal;

    if (vehiclePrice <= 0) {
      return 0;
    }

    const rawPercentage = (customerOwnershipAmount / vehiclePrice) * 100;
    // Clamp to [0, 100]
    return Math.min(100, Math.max(0, rawPercentage));
  };

  const columns: Column<Application>[] = [
    {
      id: 'customerName',
      label: 'Customer Name',
      minWidth: 150,
    },
    {
      id: 'paymentHealth',
      label: 'Payment Health',
      minWidth: 140,
      format: (_, row: Application) => {
        const health = getScheduleHealth(row);
        if (health === 'none') {
          return (
            <Box
              sx={{
                display: 'inline-flex',
                px: 1.5,
                py: 0.5,
                borderRadius: '10px',
                fontSize: 12,
                fontWeight: 600,
                bgcolor: brandChip.muted.bg,
                color: brandChip.muted.fg,
                border: brandChip.muted.border,
              }}
            >
              No schedule
            </Box>
          );
        }

        const overdueCount = getOverdueCount(row);
        const label = health === 'on_track' ? 'On track' : `Overdue (${overdueCount})`;
        const colors = health === 'on_track' ? brandChip.onTrack : brandChip.overdue;

        return (
          <Box
            sx={{
              display: 'inline-flex',
              px: 1.5,
              py: 0.5,
              borderRadius: '10px',
              fontSize: 12,
              fontWeight: 600,
              bgcolor: colors.bg,
              color: colors.fg,
              border: colors.border,
            }}
          >
            {label}
          </Box>
        );
      },
    },
    {
      id: 'riskLevel',
      label: 'Risk Level',
      minWidth: 120,
      format: (_, row: Application) => {
        const vehiclePrice = row.vehicle?.price || 0;
        const downPayment = row.downPayment || row.installmentPlan?.downPayment || 0;
        const schedule = row.installmentPlan?.schedule || [];

        const paidTotal = schedule
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const ownershipAmount = downPayment + paidTotal;
        const ownershipPct = vehiclePrice > 0 ? (ownershipAmount / vehiclePrice) * 100 : 0;
        const overdueCount = getOverdueCount(row);

        let level: 'High' | 'Medium' | 'Low' = 'Low';
        if (overdueCount >= 2 || ownershipPct < 10) {
          level = 'High';
        } else if (overdueCount === 1 || ownershipPct < 30) {
          level = 'Medium';
        }

        const colors =
          level === 'High' ? brandChip.high : level === 'Medium' ? brandChip.medium : brandChip.low;

        return (
          <Box
            sx={{
              display: 'inline-flex',
              px: 1.5,
              py: 0.5,
              borderRadius: '10px',
              fontSize: 12,
              fontWeight: 600,
              bgcolor: colors.bg,
              border: colors.border,
              color: colors.fg,
            }}
          >
            {level}
          </Box>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 180,
      format: (value: ApplicationStatus) => {
        const statusMap: Record<string, string> = {
          'under_review': 'Under Review',
          'active': 'Active',
          'completed': 'Completed',
          'submission_cancelled': 'Submission Cancelled',
          'rejected': 'Rejected',
        };
        return <StatusBadge status={statusMap[value] || value} type="application" />;
      },
    },
    {
      id: 'assetDistribution',
      label: 'Asset Distribution',
      minWidth: 220,
      format: (_, row: Application) => {
        const customerPercentage = getAssetDistribution(row);
        const bloxPercentage = 100 - customerPercentage;

        return (
          <Box sx={{ width: '100%', minWidth: 200 }}>
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                backgroundColor: '#E5E7EA',
              }}
            >
              <Box
                sx={{
                  width: `${customerPercentage}%`,
                  backgroundColor: 'var(--dark-grey)',
                }}
              />
              <Box
                sx={{
                  width: `${bloxPercentage}%`,
                  backgroundColor: 'var(--primary-color)',
                }}
              />
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 100,
      align: 'center',
      format: (_, row: Application) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Tooltip title="View application">
            <IconButton
              size="small"
              aria-label={`View application ${row.id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/applications/view/${row.id}`);
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box className="applications-list-page">
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Applications
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            {fullFilteredList.length} in this view · review, approve, and track ownership
          </Typography>
        </Box>
        <Button variant="primary" onClick={() => navigate('/admin/applications/add')} className="new-app-button">
          + New Application
        </Button>
      </Box>

      <Box className="metrics-grid">
        <Card
          title="Total Payable"
          value={metrics.totalPayable}
          moduleType="currency"
          icon={<AttachMoney sx={{ color: 'var(--blox-black)' }} />}
          className="metric-card payable"
        />
        <Card
          title="Total Receivable"
          value={metrics.totalReceivable}
          moduleType="currency"
          icon={<AccountBalance sx={{ color: 'var(--blox-black)' }} />}
          className="metric-card receivable"
        />
        <Card
          title="Average Payment Size"
          value={metrics.averagePaymentSize}
          moduleType="currency"
          icon={<TrendingUp sx={{ color: 'var(--blox-black)' }} />}
          className="metric-card profitability"
        />
        <Card
          title="Active Applications"
          value={metrics.activeApplications}
          moduleType="number"
          icon={<People sx={{ color: 'var(--blox-black)' }} />}
          className="metric-card active"
        />
      </Box>

      <Box className="status-tabs-container">
        <Tabs value={activeTab} onChange={handleTabChange} className="status-tabs">
          <Tab label="All" />
          <Tab label="In progress" />
          <Tab label="Active" />
          <Tab label="Rejected" />
          <Tab label="Completed" />
          <Tab label="Cancelled" />
        </Tabs>
      </Box>

      <Box className="list-header">
        <Typography variant="h6" className="list-title">
          List of applications
        </Typography>
        <Box className="header-actions">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={handleSearch}
            placeholder="Search applications"
            className="search-bar"
          />
        </Box>
      </Box>

      <Box className="filter-section">
        <FilterPanel
          filters={filterConfigs}
          values={advancedFilters}
          onChange={handleAdvancedFiltersChange}
          onClear={handleClearAdvancedFilters}
          title="More filters"
        />
      </Box>

      <Box className="table-section">
        {loading && list.length === 0 ? (
          <TableSkeleton rows={8} columns={7} />
        ) : !loading && list.length === 0 ? (
          <EmptyState
            title="No applications match"
            message="Try another status tab, clear search, or reset filters."
            actionLabel={Object.keys(advancedFilters).length > 0 ? 'Clear filters' : undefined}
            onAction={Object.keys(advancedFilters).length > 0 ? handleClearAdvancedFilters : undefined}
          />
        ) : (
          <Table
            columns={columns}
            rows={list}
            loading={loading}
            page={pagination.page - 1}
            rowsPerPage={pagination.limit}
            totalRows={pagination.total}
            onPageChange={(page) => dispatch(setPage(page + 1))}
            onRowsPerPageChange={(limit) => dispatch(setLimit(limit))}
            onRowClick={(row) => navigate(`/admin/applications/view/${row.id}`)}
          />
        )}
      </Box>
    </Box>
  );
};
