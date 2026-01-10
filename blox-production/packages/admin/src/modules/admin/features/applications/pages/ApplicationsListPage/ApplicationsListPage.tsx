import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, Fab, Tooltip } from '@mui/material';
import {
  AttachMoney,
  AccountBalance,
  TrendingUp,
  People,
  Visibility,
  FilterList,
  Chat,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { setList, setLoading, setError, setPage, setLimit } from '../../../../store/slices/applications.slice';
import { supabaseApiService } from '@shared/services';
import type { Application, ApplicationStatus } from '@shared/models/application.model';
import { Table, type Column, Button, StatusBadge, SearchBar, Card } from '@shared/components';
import { toast } from 'react-toastify';
import './ApplicationsListPage.scss';

// Using only Supabase - no API or localStorage fallbacks

type StatusFilter = 'all' | 'inprogress' | 'active' | 'rejected' | 'completed' | 'cancelled';

export const ApplicationsListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading, pagination } = useAppSelector((state) => state.applications);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeTab, setActiveTab] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // Store full filtered list (before pagination) for metrics calculation
  const [fullFilteredList, setFullFilteredList] = useState<Application[]>([]);

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

  const loadApplications = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      
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
        
        // Apply status filter
        const filtered = filterApplicationsByStatus(applications, statusFilter);
        
        // Store full filtered list for metrics calculation (before pagination)
        setFullFilteredList(filtered);
        
        // Pagination
        const total = filtered.length;
        const start = (pagination.page - 1) * pagination.limit;
        const end = start + pagination.limit;
        const paginatedApps = filtered.slice(start, end);
        
        dispatch(setList({ applications: paginatedApps, total }));
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
  }, [pagination.page, pagination.limit, debouncedSearchTerm, statusFilter, dispatch, filterApplicationsByStatus]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

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

    // Profitability: mirror the main dashboard formula using these totals:
    // (receivable - payable) / (receivable + payable), rounded to 2 decimals
    let profitability = 0;
    const total = totalPayable + totalReceivable;
    if (total > 0 && !isNaN(totalPayable) && !isNaN(totalReceivable)) {
      const raw =
        ((totalReceivable - totalPayable) / total) * 100;
      profitability = Math.round(raw * 100) / 100;
    }

    return {
      totalPayable: isNaN(totalPayable) ? 0 : totalPayable,
      totalReceivable: isNaN(totalReceivable) ? 0 : totalReceivable,
      profitability: isNaN(profitability) ? 0 : profitability,
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
        const schedule = row.installmentPlan?.schedule || [];
        if (schedule.length === 0) {
          return (
            <Box
              sx={{
                display: 'inline-flex',
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                bgcolor: 'var(--card-hover)',
                color: 'var(--secondary-text)',
              }}
            >
              No Schedule
            </Box>
          );
        }

        const now = new Date();
        const overdueCount = schedule.filter((p) => {
          if (p.status === 'paid') return false;
          const due = new Date(p.dueDate);
          return due.getTime() < now.getTime();
        }).length;

        const isOnTrack = overdueCount === 0;
        const label = isOnTrack ? 'On Track' : `Overdue (${overdueCount})`;
        const colors = isOnTrack
          ? { bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' }
          : { bg: 'rgba(248,113,113,0.12)', fg: '#DC2626' };

        return (
          <Box
            sx={{
              display: 'inline-flex',
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              bgcolor: colors.bg,
              color: colors.fg,
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

        const now = new Date();
        const overdueCount = schedule.filter((p) => {
          if (p.status === 'paid') return false;
          const due = new Date(p.dueDate);
          return due.getTime() < now.getTime();
        }).length;

        let level: 'High' | 'Medium' | 'Low' = 'Low';
        if (overdueCount >= 2 || ownershipPct < 10) {
          level = 'High';
        } else if (overdueCount === 1 || ownershipPct < 30) {
          level = 'Medium';
        }

        const colors =
          level === 'High'
            ? { bg: 'rgba(248,113,113,0.12)', fg: '#DC2626' }
            : level === 'Medium'
            ? { bg: 'rgba(250,204,21,0.16)', fg: '#B45309' }
            : { bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' };

        return (
          <Box
            sx={{
              display: 'inline-flex',
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              bgcolor: colors.bg,
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
                  backgroundColor: '#E2B13C',
                }}
              />
              <Box
                sx={{
                  width: `${bloxPercentage}%`,
                  backgroundColor: '#09C97F',
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
          <Tooltip title="View">
            <IconButton size="small" onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/applications/view/${row.id}`);
            }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredList = useMemo(() => {
    // No dummy data - use only what's in Redux state
    let filtered = filterApplicationsByStatus(list, statusFilter);
    
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [list, statusFilter, searchTerm]);

  return (
    <Box className="applications-list-page">
      {/* Header */}
      <Box className="page-header">
        <Typography variant="h2" className="page-title">
          Applications - {fullFilteredList.length}
        </Typography>
      </Box>

      {/* Metrics Cards */}
      <Box className="metrics-grid">
        <Card
          title="Total Payable"
          value={metrics.totalPayable}
          moduleType="currency"
          icon={<AttachMoney sx={{ color: '#DAFF01' }} />}
          className="metric-card payable"
        />
        <Card
          title="Total Receivable"
          value={metrics.totalReceivable}
          moduleType="currency"
          icon={<AccountBalance sx={{ color: '#2196F3' }} />}
          className="metric-card receivable"
        />
        <Card
          title="Total Profibility"
          value={metrics.profitability}
          moduleType="percentage"
          icon={<TrendingUp sx={{ color: '#FF9800' }} />}
          className="metric-card profitability"
        />
        <Card
          title="Active Applications"
          value={metrics.activeApplications}
          moduleType="number"
          icon={<People sx={{ color: '#DAFF01' }} />}
          className="metric-card active"
        />
      </Box>

      {/* Status Filter Tabs */}
      <Box className="status-tabs-container">
        <Tabs value={activeTab} onChange={handleTabChange} className="status-tabs">
          <Tab label="All" />
          <Tab label="InProgress" />
          <Tab label="Active" />
          <Tab label="Rejected" />
          <Tab label="Completed" />
          <Tab label="Cancelled" />
        </Tabs>
      </Box>

      {/* List Header */}
      <Box className="list-header">
        <Typography variant="h6" className="list-title">
          List of Applications
        </Typography>
        <Box className="header-actions">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={handleSearch}
            placeholder="Search"
            className="search-bar"
          />
          <Button variant="secondary" startIcon={<FilterList />} className="filters-button">
            Filters
          </Button>
          <Button variant="primary" onClick={() => navigate('/admin/applications/add')} className="new-app-button">
            + New Application
          </Button>
        </Box>
      </Box>

      {/* Table Section */}
      <Box className="table-section">
        <Table
          columns={columns}
          rows={filteredList}
          loading={loading}
          page={pagination.page - 1}
          rowsPerPage={pagination.limit}
          totalRows={pagination.total || filteredList.length}
          onPageChange={(page) => dispatch(setPage(page + 1))}
          onRowsPerPageChange={(limit) => dispatch(setLimit(limit))}
          onRowClick={(row) => navigate(`/admin/applications/view/${row.id}`)}
        />
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        className="fab-chat"
        onClick={() => {
          // TODO: Open chat/help
          toast.info('Chat feature coming soon');
        }}
      >
        <Chat />
      </Fab>
    </Box>
  );
};
