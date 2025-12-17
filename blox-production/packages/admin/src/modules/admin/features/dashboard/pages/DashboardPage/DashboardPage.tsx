import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Popover } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  DescriptionOutlined,
  TrendingUp,
  ShowChart,
  Person,
  ArrowForward,
  FilterList,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setStats, setFilters, setLoading } from '../../../../store/slices/dashboard.slice';
import { apiService } from '@shared/services/api.service';
import type { DashboardStats } from '@shared/models/dashboard.model';
import { Card, Loading, DatePicker, Button, HorizontalBarChart, SegmentedBarChart, VerticalBarChart } from '@shared/components';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import type { Moment } from 'moment';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import './DashboardPage.scss';

ChartJS.register(ArcElement, Tooltip, Legend);

// Temporary dummy data for testing
const dummyStats: DashboardStats = {
  projectedInsurance: 50000,
  projectedFunding: 250000,
  projectedRevenue: 175000,
  realRevenue: 330000,
  paidInstallments: 3,
  unpaidInstallments: 0,
  userBloxPercentage: 73.33,
  companyBloxPercentage: 26.67,
  totalAssetsOwnership: 100,
  customerOwnershipPercentage: 73.33,
  bloxOwnershipPercentage: 26.67,
  activeApplications: 1,
  monthlyPayable: 0,
  monthlyReceivable: 33000000, // In cents (330000.00 QAR)
  profitability: 100.00,
};

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats: reduxStats, filters, loading } = useAppSelector((state) => state.dashboard);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Use dummy data if no real data is available (temporary)
  const stats = reduxStats || dummyStats;

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      dispatch(setLoading(true));
      const dateRange = filters || {
        startDate: moment().startOf('month').format('YYYY-MM-DD'),
        endDate: moment().endOf('month').format('YYYY-MM-DD'),
      };

      const response = await apiService.post<DashboardStats>('/sales/dashboard-stats', dateRange);

      if (response.status === 'SUCCESS' && response.data) {
        dispatch(setStats(response.data));
      } else {
        // If API fails, use dummy data temporarily
        dispatch(setStats(dummyStats));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use dummy data on error (temporary)
      dispatch(setStats(dummyStats));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDateRangeChange = (startDate: Moment | null, endDate: Moment | null) => {
    if (startDate && endDate) {
      dispatch(
        setFilters({
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
        })
      );
    }
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const formatDateRange = () => {
    if (filters?.startDate && filters?.endDate) {
      const start = moment(filters.startDate).format('DD MMM YYYY');
      const end = moment(filters.endDate).format('DD MMM YYYY');
      return `${start} - ${end}`;
    }
    const start = moment().startOf('month').format('DD MMM YYYY');
    const end = moment().endOf('month').format('DD MMM YYYY');
    return `${start} - ${end}`;
  };

  const installmentChartData = {
    labels: ['Paid', 'Unpaid'],
    datasets: [
      {
        data: [stats.paidInstallments, stats.unpaidInstallments],
        backgroundColor: ['#09C97F', '#F95668'],
        borderWidth: 0,
      },
    ],
  };

  if (loading && !reduxStats) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  return (
    <Box className="dashboard-page">
      <Box className="dashboard-header">
        <Typography variant="h2">Dashboard</Typography>
        <Button
          variant="secondary"
          startIcon={<FilterList />}
          onClick={handleFilterClick}
          sx={{
            textTransform: 'none',
            minWidth: '200px',
            justifyContent: 'flex-start',
          }}
        >
          {formatDateRange()}
        </Button>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 3, minWidth: '350px' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Select Date Range
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DatePicker
                label="Start date"
                value={filters?.startDate ? moment(filters.startDate) : moment().startOf('month')}
                onChange={(value) =>
                  handleDateRangeChange(value, moment(filters?.endDate || moment().endOf('month')))
                }
              />
              <DatePicker
                label="End date"
                value={filters?.endDate ? moment(filters.endDate) : moment().endOf('month')}
                onChange={(value) =>
                  handleDateRangeChange(moment(filters?.startDate || moment().startOf('month')), value)
                }
              />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="secondary" onClick={handleFilterClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleFilterClose();
                  }}
                >
                  Apply
                </Button>
              </Box>
            </Box>
          </Box>
        </Popover>
      </Box>

      {/* Top Metrics Cards */}
      <Box 
        className="stats-grid-container"
        sx={{
          width: '100%',
          display: 'flex',
          gap: '24px',
          marginBottom: 'var(--spacing-lg)',
          '& > *': {
            flex: '1 1 0',
            minWidth: 0,
          },
        }}
      >
        <Card
          title="Projected Insurance"
          value={stats.projectedInsurance}
          moduleType="currency"
          icon={<DescriptionOutlined />}
        />
        <Card
          title="Projected Funding"
          value={stats.projectedFunding}
          moduleType="currency"
          icon={<DescriptionOutlined />}
        />
        <Card
          title="Projected Revenue"
          value={stats.projectedRevenue}
          moduleType="currency"
          icon={<TrendingUp />}
        />
        <Card
          title="Real Revenue"
          value={stats.realRevenue}
          moduleType="currency"
          icon={<ShowChart />}
        />
      </Box>

      {/* Middle Section - Asset Distribution and Installments */}
      <Box 
        className="charts-grid-container"
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'stretch',
          gap: '24px',
          marginBottom: 'var(--spacing-lg)',
          '@media (max-width: 960px)': {
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '16px',
          },
        }}
      >
        {/* Asset Distribution Panel */}
        <Paper 
          className="dashboard-panel"
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h3" className="panel-title">
            Asset Distribution
          </Typography>
          <Box className="panel-content">
            <HorizontalBarChart
              label="Total Assets Ownership"
              value={stats.totalAssetsOwnership}
              maxValue={100}
              color="#008A6C"
            />
            <SegmentedBarChart
              label="Total Assets Distributions"
              segments={[
                {
                  label: 'Owned by Customer',
                  value: stats.customerOwnershipPercentage,
                  color: '#E2B13C',
                },
                {
                  label: 'Owned by Blox',
                  value: stats.bloxOwnershipPercentage,
                  color: '#09C97F',
                },
              ]}
              total={100}
            />
          </Box>
        </Paper>

        {/* This Month's Installments Panel */}
        <Paper 
          className="dashboard-panel"
          sx={{
            flex: '2 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h3" className="panel-title">
            This Month's Installments
          </Typography>
          <Box className="panel-content installments-panel">
            {stats.paidInstallments === 0 && stats.unpaidInstallments === 0 ? (
              <Box className="no-data-container">
                <Typography variant="body2" className="no-data-text">
                  No data
                </Typography>
              </Box>
            ) : (
              <Box className="installments-charts">
                <Box className="bars-section">
                  <VerticalBarChart
                    title=""
                  bars={[
                    {
                      label: 'Paid Installments',
                      value: stats.paidInstallments,
                      color: '#09C97F',
                    },
                    {
                      label: 'Unpaid Installments',
                      value: stats.unpaidInstallments,
                      color: '#F95668',
                    },
                  ]}
                  />
                </Box>
                <Box className="donut-section">
                  <Doughnut
                    data={installmentChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            )}
            <Box className="installments-summary">
              <Typography variant="body2" className="installment-item">
                {stats.paidInstallments} Paid Installments
              </Typography>
              <Typography variant="body2" className="installment-item">
                {stats.unpaidInstallments} Unpaid Installments
              </Typography>
            </Box>
            <Box className="active-applications">
              <Box className="applications-info">
                <Person sx={{ fontSize: 20, mr: 1, color: '#008A6C' }} />
                <Typography variant="body2">
                  {stats.activeApplications} Active Applications
                </Typography>
              </Box>
              <Button
                variant="primary"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/admin/ledgers')}
              >
                View Ledger
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Bottom Section - Payable vs Receivable */}
      <Grid container spacing={3} className="bottom-grid">
        <Grid item xs={12}>
          <Paper className="dashboard-panel">
            <Typography variant="h3" className="panel-title">
              Payable vs. Receivable
            </Typography>
            <Box className="payable-receivable-content">
              <Box className="financial-item">
                <Typography variant="body2" className="financial-label">
                  Monthly Payable
                </Typography>
                <Typography variant="h4" className="financial-value payable">
                  QAR {(stats.monthlyPayable / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box className="financial-item">
                <Typography variant="body2" className="financial-label">
                  Monthly Receivable
                </Typography>
                <Typography variant="h4" className="financial-value receivable">
                  QAR {(stats.monthlyReceivable / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box className="financial-item">
                <Typography variant="body2" className="financial-label">
                  Profitability
                </Typography>
                <Typography variant="h4" className="financial-value profitability">
                  {stats.profitability.toFixed(2)}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};