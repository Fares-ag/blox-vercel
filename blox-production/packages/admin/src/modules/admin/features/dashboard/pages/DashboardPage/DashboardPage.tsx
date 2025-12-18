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
  Schedule,
  WarningAmber,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setStats, setFilters, setLoading, setError } from '../../../../store/slices/dashboard.slice';
import { supabase } from '@shared/services';
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

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, filters, loading, error } = useAppSelector((state) => state.dashboard);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      // If no filters are set, use an "overall" range (all time) for stats.
      const dateRange = filters || {
        startDate: '1900-01-01',
        endDate: '2100-12-31',
      };

      // Call Supabase RPC instead of external API
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      });

      if (error) {
        console.error('Failed to load dashboard data from Supabase:', error);
        dispatch(setError(error.message || 'Failed to load dashboard data'));
        return;
      }

      if (data && data.length > 0) {
        const row = data[0] as any;
        const statsFromSupabase: DashboardStats = {
          projectedInsurance: Number(row.projected_insurance || 0),
          projectedFunding: Number(row.projected_funding || 0),
          projectedRevenue: Number(row.projected_revenue || 0),
          realRevenue: Number(row.real_revenue || 0),
          paidInstallments: Number(row.paid_installments || 0),
          unpaidInstallments: Number(row.unpaid_installments || 0),
          userBloxPercentage: Number(row.user_blox_percentage || 0),
          companyBloxPercentage: Number(row.company_blox_percentage || 0),
          totalAssetsOwnership: Number(row.total_assets_ownership || 100),
          customerOwnershipPercentage: Number(row.customer_ownership_percentage || 0),
          bloxOwnershipPercentage: Number(row.blox_ownership_percentage || 0),
          activeApplications: Number(row.active_applications || 0),
          monthlyPayable: Number(row.monthly_payable || 0),
          monthlyReceivable: Number(row.monthly_receivable || 0),
          profitability: Number(row.profitability || 0),
          deferralsInPeriod: Number(row.deferrals_in_period || 0),
          customersNearDeferralLimit: Number(row.customers_near_deferral_limit || 0),
        };
        dispatch(setStats(statsFromSupabase));
      } else {
        dispatch(setError('No dashboard data returned from Supabase'));
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      dispatch(setError(err.message || 'Failed to load dashboard data'));
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
    // Default label when no explicit filter is selected
    return 'Overall';
  };

  if (loading && !stats) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  // If there's no stats data (e.g. API failed), show a friendly message instead of dummy data
  if (!stats) {
    return (
      <Box className="dashboard-page">
        <Box className="dashboard-header">
          <Typography variant="h2">Dashboard</Typography>
        </Box>
        <Paper
          className="dashboard-panel"
          sx={{
            mt: 4,
            maxWidth: 600,
            marginInline: 'auto',
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" sx={{ mb: 2 }}>
            No dashboard data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error || 'The dashboard API did not return any data for the selected date range.'}
          </Typography>
        </Paper>
      </Box>
    );
  }

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

      {/* Deferrals Overview */}
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
          title="Deferrals (Selected Period)"
          value={stats.deferralsInPeriod}
          moduleType="number"
          icon={<Schedule />}
        />
        <Card
          title="Customers Near Deferral Limit"
          value={stats.customersNearDeferralLimit}
          moduleType="number"
          icon={<WarningAmber />}
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