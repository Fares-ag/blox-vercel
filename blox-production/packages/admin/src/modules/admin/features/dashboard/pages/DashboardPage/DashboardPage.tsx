import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Card, Loading, DatePicker, Button, HorizontalBarChart, SegmentedBarChart, VerticalBarChart, LineChart, FunnelChart, Table } from '@shared/components';
import { analyticsService, reportExportService } from '@shared/services';
import type { AnalyticsData } from '@shared/models/dashboard.model';
import { formatCurrency } from '@shared/utils/formatters';
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
import { PictureAsPdf, TableChart } from '@mui/icons-material';
import { toast } from 'react-toastify';
import './DashboardPage.scss';

ChartJS.register(ArcElement, Tooltip, Legend);

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, filters, loading, error } = useAppSelector((state) => state.dashboard);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const loadDashboardData = useCallback(async () => {
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
        const row = data[0] as Record<string, unknown>;
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
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to load dashboard data');
      if (import.meta.env.DEV) {
        console.error('Failed to load dashboard data:', error);
      }
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [filters, dispatch]);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      // Use filters if available, otherwise use default date range
      const dateRange = filters || {
        startDate: '1900-01-01',
        endDate: '2100-12-31',
      };
      
      const data = await analyticsService.getAllAnalyticsData(dateRange, 6, 50);
      setAnalyticsData(data);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      if (import.meta.env.DEV) {
        console.error('Failed to load analytics data:', error);
      }
      // Set empty data structure so sections still show with error message
      setAnalyticsData({
        revenueForecast: [],
        conversionFunnel: [],
        paymentCollectionRates: [],
        customerLifetimeValues: [],
        topCustomers: [],
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleDateRangeChange = useCallback((startDate: Moment | null, endDate: Moment | null) => {
    if (startDate && endDate) {
      dispatch(
        setFilters({
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
        })
      );
    }
  }, [dispatch]);

  const handleFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleFilterClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const open = Boolean(anchorEl);

  const formatDateRange = useMemo(() => {
    if (filters?.startDate && filters?.endDate) {
      const start = moment(filters.startDate).format('DD MMM YYYY');
      const end = moment(filters.endDate).format('DD MMM YYYY');
      return `${start} - ${end}`;
    }
    // Default label when no explicit filter is selected
    return 'Overall';
  }, [filters]);

  // Memoize chart labels and datasets to prevent unnecessary re-renders
  const revenueForecastLabels = useMemo(() => {
    return analyticsData?.revenueForecast.map((r) => r.period) ?? [];
  }, [analyticsData?.revenueForecast]);

  const revenueForecastDatasets = useMemo(() => {
    if (!analyticsData?.revenueForecast.length) return [];
    return [
      {
        label: 'Projected Revenue',
        data: analyticsData.revenueForecast.map((r) => r.projectedRevenue),
        borderColor: '#00CFA2',
        backgroundColor: 'rgba(0, 207, 162, 0.1)',
      },
      {
        label: 'Actual Revenue',
        data: analyticsData.revenueForecast.map((r) => r.actualRevenue),
        borderColor: '#09C97F',
        backgroundColor: 'rgba(9, 201, 127, 0.1)',
      },
      {
        label: 'Forecasted Revenue',
        data: analyticsData.revenueForecast.map((r) => r.forecastedRevenue),
        borderColor: '#BCB4FF',
        backgroundColor: 'rgba(188, 180, 255, 0.1)',
        borderDash: [5, 5],
      },
    ];
  }, [analyticsData?.revenueForecast]);

  const paymentCollectionLabels = useMemo(() => {
    return analyticsData?.paymentCollectionRates.map((r) => r.period) ?? [];
  }, [analyticsData?.paymentCollectionRates]);

  const paymentCollectionDatasets = useMemo(() => {
    if (!analyticsData?.paymentCollectionRates.length) return [];
    return [
      {
        label: 'Collection Rate (%)',
        data: analyticsData.paymentCollectionRates.map((r) => r.collectionRate),
        borderColor: '#09C97F',
        backgroundColor: 'rgba(9, 201, 127, 0.1)',
      },
      {
        label: 'Overdue Rate (%)',
        data: analyticsData.paymentCollectionRates.map((r) => r.overdueRate),
        borderColor: '#F95668',
        backgroundColor: 'rgba(249, 86, 104, 0.1)',
      },
    ];
  }, [analyticsData?.paymentCollectionRates]);

  if (loading && !stats) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  // If there's no stats data (e.g. API failed), show a friendly message instead of dummy data
  if (!stats) {
    return (
      <Box className="dashboard-page">
        <Box className="dashboard-header">
          <Typography variant="h2" sx={{ fontWeight: 700, color: 'var(--primary-text)', fontSize: 32, letterSpacing: '-0.02em' }}>Dashboard</Typography>
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
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 700, color: 'var(--primary-text)', fontSize: 24 }}>
            No dashboard data available
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--secondary-text)', opacity: 0.9, fontSize: 15, fontWeight: 500 }}>
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
        <Typography variant="h2" sx={{ fontWeight: 700, color: 'var(--primary-text)', fontSize: 32, letterSpacing: '-0.02em', marginBottom: 0 }}>Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
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
            {formatDateRange}
          </Button>
          <Button
            variant="primary"
            startIcon={<PictureAsPdf />}
            onClick={async () => {
              if (stats && analyticsData) {
                try {
                  await reportExportService.exportExecutiveDashboardPDF(
                    stats,
                    analyticsData.topCustomers,
                    filters || { startDate: '1900-01-01', endDate: '2100-12-31' }
                  );
                  toast.success('Executive Dashboard PDF exported successfully');
                } catch (error: unknown) {
                  const err = error instanceof Error ? error : new Error('Failed to export PDF');
                  toast.error(err.message);
                }
              } else {
                toast.warning('Please wait for data to load');
              }
            }}
            disabled={!stats || !analyticsData}
          >
            Executive Dashboard (PDF)
          </Button>
          <Button
            variant="secondary"
            startIcon={<PictureAsPdf />}
            onClick={async () => {
              if (stats && analyticsData) {
                try {
                  await reportExportService.exportMonthlyFinancialSummaryPDF(
                    stats,
                    analyticsData.revenueForecast,
                    analyticsData.paymentCollectionRates,
                    analyticsData.conversionFunnel,
                    analyticsData.topCustomers,
                    filters || { startDate: '1900-01-01', endDate: '2100-12-31' }
                  );
                  toast.success('Monthly Financial Summary PDF exported successfully');
                } catch (error: unknown) {
                  const err = error instanceof Error ? error : new Error('Failed to export PDF');
                  toast.error(err.message);
                }
              } else {
                toast.warning('Please wait for data to load');
              }
            }}
            disabled={!stats || !analyticsData}
          >
            Monthly Summary (PDF)
          </Button>
        </Box>
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
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
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
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
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
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          '@media (max-width: 960px)': {
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 'var(--spacing-sm)',
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
                <Person sx={{ fontSize: 20, mr: 1, color: 'var(--primary-color)' }} />
                <Typography variant="body2" sx={{ color: 'var(--primary-text)', fontSize: 15, fontWeight: 600 }}>
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
                  Average Payment Size
                </Typography>
                <Typography variant="h4" className="financial-value average-payment-size">
                  QAR {(stats.monthlyReceivable / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Enhanced Analytics Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h2" sx={{ mb: 3, fontWeight: 700, color: 'var(--primary-text)', fontSize: 28, letterSpacing: '-0.02em' }}>
          Enhanced Analytics
        </Typography>
        
        {analyticsLoading ? (
          <Loading message="Loading enhanced analytics..." />
        ) : analyticsData ? (
          <>
            {/* Revenue Forecasting */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <Paper className="dashboard-panel">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" className="panel-title">
                    Revenue Forecasting
                  </Typography>
                  <Button
                    variant="secondary"
                    size="small"
                    startIcon={<TableChart />}
                    onClick={() => {
                      if (analyticsData.revenueForecast.length > 0) {
                        reportExportService.exportRevenueForecast(analyticsData.revenueForecast);
                        toast.success('Revenue forecast exported successfully');
                      }
                    }}
                  >
                    Export Excel
                  </Button>
                </Box>
                {analyticsLoading ? (
                  <Loading message="Loading revenue forecast..." />
                ) : revenueForecastDatasets.length > 0 ? (
                  <LineChart
                    title=""
                    labels={revenueForecastLabels}
                    datasets={revenueForecastDatasets}
                    height={300}
                    yAxisLabel="Amount (QAR)"
                  />
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'var(--primary-text)', opacity: 1, fontSize: 15, fontWeight: 600 }}>
                    No revenue forecast data available
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Conversion Funnel */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper className="dashboard-panel">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" className="panel-title">
                    Application Conversion Funnel
                  </Typography>
                  <Button
                    variant="secondary"
                    size="small"
                    startIcon={<TableChart />}
                    onClick={() => {
                      if (analyticsData.conversionFunnel.length > 0) {
                        reportExportService.exportConversionFunnel(analyticsData.conversionFunnel);
                        toast.success('Conversion funnel exported successfully');
                      }
                    }}
                  >
                    Export
                  </Button>
                </Box>
                {analyticsLoading ? (
                  <Loading message="Loading conversion funnel..." />
                ) : analyticsData.conversionFunnel.length > 0 ? (
                  <FunnelChart
                    stages={analyticsData.conversionFunnel.map((stage) => ({
                      label: stage.stage,
                      value: stage.count,
                      percentage: stage.percentage,
                      dropOffRate: stage.dropOffRate,
                      color: stage.stage === 'Active' ? '#09C97F' : stage.stage === 'Completed' ? '#00CFA2' : '#BCB4FF',
                    }))}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No conversion funnel data available
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Payment Collection Rates */}
            <Grid item xs={12} md={6}>
              <Paper className="dashboard-panel">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" className="panel-title">
                    Payment Collection Rates
                  </Typography>
                  <Button
                    variant="secondary"
                    size="small"
                    startIcon={<TableChart />}
                    onClick={() => {
                      if (analyticsData.paymentCollectionRates.length > 0) {
                        reportExportService.exportPaymentCollectionRates(analyticsData.paymentCollectionRates);
                        toast.success('Payment collection rates exported successfully');
                      }
                    }}
                  >
                    Export
                  </Button>
                </Box>
                {analyticsLoading ? (
                  <Loading message="Loading payment collection rates..." />
                ) : paymentCollectionDatasets.length > 0 ? (
                  <LineChart
                    title=""
                    labels={paymentCollectionLabels}
                    datasets={paymentCollectionDatasets}
                    height={300}
                    yAxisLabel="Percentage (%)"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No payment collection data available
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Customer Lifetime Value */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <Paper className="dashboard-panel">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" className="panel-title">
                    Top Customers by Lifetime Value
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="secondary"
                      size="small"
                      startIcon={<TableChart />}
                      onClick={() => {
                        if (analyticsData.topCustomers.length > 0) {
                          reportExportService.exportCustomerLifetimeValue(analyticsData.topCustomers);
                          toast.success('Customer lifetime value exported successfully');
                        }
                      }}
                    >
                      Export Excel
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      startIcon={<PictureAsPdf />}
                      onClick={() => {
                        if (stats && analyticsData) {
                          reportExportService.exportDashboardReport(
                            stats,
                            analyticsData.revenueForecast,
                            analyticsData.conversionFunnel,
                            analyticsData.paymentCollectionRates,
                            analyticsData.topCustomers,
                            filters || { startDate: '1900-01-01', endDate: '2100-12-31' }
                          );
                          toast.success('Dashboard report exported successfully');
                        }
                      }}
                    >
                      Export Full Report (PDF)
                    </Button>
                  </Box>
                </Box>
                {analyticsLoading ? (
                  <Loading message="Loading customer lifetime value..." />
                ) : analyticsData.topCustomers.length > 0 ? (
                  <Table
                    columns={[
                      { id: 'customerName', label: 'Customer Name' },
                      { id: 'totalRevenue', label: 'Total Revenue', format: (value) => formatCurrency(value) },
                      { id: 'clv', label: 'Lifetime Value (CLV)', format: (value) => formatCurrency(value) },
                      { id: 'totalApplications', label: 'Applications' },
                      { id: 'averagePaymentAmount', label: 'Avg Payment', format: (value) => formatCurrency(value) },
                      { id: 'totalPayments', label: 'Total Payments' },
                    ]}
                    rows={analyticsData.topCustomers.map((customer, index) => ({
                      id: customer.customerEmail || `customer-${index}`,
                      customerName: customer.customerName,
                      totalRevenue: customer.totalRevenue,
                      clv: customer.clv,
                      totalApplications: customer.totalApplications,
                      averagePaymentAmount: customer.averagePaymentAmount,
                      totalPayments: customer.totalPayments,
                    }))}
                    rowsPerPage={10}
                    totalRows={analyticsData.topCustomers.length}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No customer lifetime value data available
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
          </>
        ) : (
          <Paper className="dashboard-panel" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Analytics data not available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please ensure the analytics database functions are created in Supabase.
              <br />
              Run the SQL script: <code>supabase-enhanced-analytics.sql</code>
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};