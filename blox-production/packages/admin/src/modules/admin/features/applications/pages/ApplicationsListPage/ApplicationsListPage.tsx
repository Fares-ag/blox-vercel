import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, LinearProgress, Fab, Tooltip } from '@mui/material';
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

  useEffect(() => {
    loadApplications();
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  const loadApplications = async () => {
    try {
      dispatch(setLoading(true));
      
      // Load from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        let applications = supabaseResponse.data;
        
        // Apply search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          applications = applications.filter((app: Application) =>
            app.customerName?.toLowerCase().includes(searchLower) ||
            app.customerEmail?.toLowerCase().includes(searchLower) ||
            app.id?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply status filter
        const filtered = filterApplicationsByStatus(applications, statusFilter);
        
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
  };

  const filterApplicationsByStatus = (applications: Application[], filter: StatusFilter): Application[] => {
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
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    dispatch(setPage(1));
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const statusMap: StatusFilter[] = ['all', 'inprogress', 'active', 'rejected', 'completed', 'cancelled'];
    setStatusFilter(statusMap[newValue]);
    dispatch(setPage(1));
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    // Use Redux state instead of localStorage
    const allApps = list;
    const filtered = filterApplicationsByStatus(allApps, statusFilter);
    const totalPayable = 0; // Calculate from payment data
    const totalReceivable = filtered.reduce((sum, app) => sum + (app.loanAmount || 0), 0);
    const profitability = filtered.length > 0 ? 100.0 : 0; // Calculate actual profitability

    return {
      totalPayable,
      totalReceivable,
      profitability,
      activeApplications: filtered.filter((app) => app.status === 'active' || app.status === 'under_review').length,
    };
  }, [list, statusFilter]);

  // Calculate asset distribution percentage (dummy calculation)
  const getAssetDistribution = (application: Application): number => {
    if (application.status === 'completed') return 0;
    if (application.status === 'active') {
      // Random between 80-100 for active
      return application.id === 'APP003' ? 99.97 : 80.0;
    }
    return 0;
  };

  const columns: Column<Application>[] = [
    {
      id: 'customerName',
      label: 'Customer Name',
      minWidth: 150,
    },
    {
      id: 'aiResponse',
      label: 'AI Response',
      minWidth: 120,
      format: () => 'N/A',
    },
    {
      id: 'aiReason',
      label: 'AI Reason',
      minWidth: 120,
      format: () => 'AI Failed',
    },
    {
      id: 'adminResponse',
      label: 'Admin Response',
      minWidth: 150,
      format: (_, row: Application) => {
        if (row.status === 'active') return 'approved';
        if (row.status === 'completed') return 'approved';
        return 'N/A';
      },
    },
    {
      id: 'adminReason',
      label: 'Admin Reason',
      minWidth: 150,
      format: (_, row: Application) => {
        if (row.status === 'active') return row.id === 'APP003' ? 'done' : 'test';
        if (row.status === 'completed') return 'done';
        return 'N/A';
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
      minWidth: 200,
      format: (_, row: Application) => {
        const percentage = getAssetDistribution(row);
        const color = percentage >= 90 ? '#00CFA2' : percentage >= 50 ? '#FFA726' : '#E5E7EA';
        return (
          <Box sx={{ width: '100%', minWidth: 150 }}>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#E5E7EA',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 4,
                },
              }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#666' }}>
              {percentage.toFixed(2)}%
            </Typography>
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
          Applications - {filteredList.length}
        </Typography>
      </Box>

      {/* Metrics Cards */}
      <Box className="metrics-grid">
        <Card
          title="Total Payable"
          value={`${metrics.totalPayable.toFixed(2)} QAR`}
          icon={<AttachMoney sx={{ color: '#00CFA2' }} />}
          className="metric-card payable"
        />
        <Card
          title="Total Receivable"
          value={`${metrics.totalReceivable.toFixed(2)} QAR`}
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
          value={`${metrics.activeApplications} Applications`}
          icon={<People sx={{ color: '#00CFA2' }} />}
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
