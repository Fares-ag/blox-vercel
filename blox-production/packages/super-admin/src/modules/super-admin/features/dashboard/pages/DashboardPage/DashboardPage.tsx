import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  TrendingUp,
  People,
  Description,
  Assessment,
  Refresh,
  Timeline,
} from '@mui/icons-material';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { activityTrackingService } from '@shared/services';
import { Select, EmptyState, Skeleton } from '@shared/components';
import moment from 'moment';
import './DashboardPage.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const brandColors = {
  primary: '#00CFA2',
  primaryDark: '#00B894',
  bloxBlack: '#16535B',
  darkGrey: '#708090',
  midGrey: '#A8B2BC',
  lightGrey: '#F2F6F6',
};

const dateRangeOptions = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const chartTooltip = {
  backgroundColor: brandColors.bloxBlack,
  titleColor: brandColors.primary,
  bodyColor: brandColors.lightGrey,
  borderColor: brandColors.primary,
  borderWidth: 1,
};

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [stats, setStats] = useState<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Array<{ userEmail: string; count: number }>;
    actionsByResource: Record<string, number>;
  } | null>(null);

  const getDateRange = (range: '7d' | '30d' | '90d' | 'all') => {
    switch (range) {
      case '7d':
        return { startDate: moment().subtract(7, 'days').toDate(), endDate: new Date() };
      case '30d':
        return { startDate: moment().subtract(30, 'days').toDate(), endDate: new Date() };
      case '90d':
        return { startDate: moment().subtract(90, 'days').toDate(), endDate: new Date() };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const loadStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const range = getDateRange(dateRange);
      const result = await activityTrackingService.getActivityStats(range);
      setStats(result);
    } catch (error) {
      console.error('Failed to load activity stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadStats(false);
  }, [loadStats]);

  const actionsByTypeData = stats && Object.keys(stats.actionsByType).length > 0 ? {
    labels: Object.keys(stats.actionsByType),
    datasets: [{
      label: 'Actions',
      data: Object.values(stats.actionsByType),
      backgroundColor: [
        brandColors.primary,
        brandColors.primaryDark,
        brandColors.darkGrey,
        brandColors.midGrey,
        brandColors.primary,
      ],
      borderColor: brandColors.bloxBlack,
      borderWidth: 1,
      borderRadius: 6,
    }],
  } : null;

  const actionsByResourceData = stats && Object.keys(stats.actionsByResource).length > 0 ? {
    labels: Object.keys(stats.actionsByResource),
    datasets: [{
      label: 'Resources',
      data: Object.values(stats.actionsByResource),
      backgroundColor: [
        brandColors.primary,
        brandColors.primaryDark,
        brandColors.darkGrey,
        brandColors.midGrey,
        brandColors.lightGrey,
      ],
      borderColor: brandColors.bloxBlack,
      borderWidth: 2,
    }],
  } : null;

  const topUsersData = stats && stats.actionsByUser.length > 0 ? {
    labels: stats.actionsByUser.slice(0, 10).map((u) => u.userEmail.split('@')[0]),
    datasets: [{
      label: 'Actions',
      data: stats.actionsByUser.slice(0, 10).map((u) => u.count),
      backgroundColor: brandColors.primary,
      borderColor: brandColors.bloxBlack,
      borderWidth: 1,
      borderRadius: 6,
    }],
  } : null;

  const rangeLabel = dateRangeOptions.find((o) => o.value === dateRange)?.label || dateRange;

  return (
    <Box className="super-admin-dashboard">
      <Box className="dashboard-header">
        <Box>
          <Typography variant="h2" className="dashboard-title">
            Dashboard
          </Typography>
          <Typography variant="body2" className="dashboard-subtitle">
            Platform activity at a glance
          </Typography>
        </Box>
        <Box className="dashboard-controls">
          <Select
            label="Time Range"
            size="small"
            value={dateRange}
            options={dateRangeOptions}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
            className="dashboard-range-select"
            fullWidth={false}
            sx={{ minWidth: 160 }}
          />
          <Tooltip title="Refresh metrics">
            <span>
              <IconButton
                onClick={() => loadStats(true)}
                size="small"
                aria-label="Refresh dashboard metrics"
                disabled={loading || refreshing}
                className="dashboard-refresh-btn"
              >
                <Refresh className={refreshing ? 'spin' : undefined} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {loading ? (
        <Grid container spacing={3}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton height={120} className="dashboard-skeleton-card" />
            </Grid>
          ))}
          <Grid item xs={12} md={8}>
            <Skeleton height={400} className="dashboard-skeleton-card" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton height={400} className="dashboard-skeleton-card" />
          </Grid>
        </Grid>
      ) : stats ? (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-primary">
              <CardContent>
                <Box className="stat-icon" aria-hidden>
                  <Assessment />
                </Box>
                <Typography
                  variant="h3"
                  className="stat-value"
                  sx={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {stats.totalActions.toLocaleString()}
                </Typography>
                <Typography variant="body2" className="stat-label">
                  Total Actions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-secondary">
              <CardContent>
                <Box className="stat-icon" aria-hidden>
                  <People />
                </Box>
                <Typography
                  variant="h3"
                  className="stat-value"
                  sx={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {stats.actionsByUser.length}
                </Typography>
                <Typography variant="body2" className="stat-label">
                  Active Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-accent">
              <CardContent>
                <Box className="stat-icon" aria-hidden>
                  <Description />
                </Box>
                <Typography
                  variant="h3"
                  className="stat-value"
                  sx={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {Object.keys(stats.actionsByResource).length}
                </Typography>
                <Typography variant="body2" className="stat-label">
                  Resource Types
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-info">
              <CardContent>
                <Box className="stat-icon" aria-hidden>
                  <TrendingUp />
                </Box>
                <Typography
                  variant="h3"
                  className="stat-value"
                  sx={{ fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {Object.keys(stats.actionsByType).length}
                </Typography>
                <Typography variant="body2" className="stat-label">
                  Action Types
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">Actions by Type</Typography>
                <Chip label={rangeLabel} size="small" className="range-chip" />
              </Box>
              {actionsByTypeData ? (
                <Box className="chart-canvas">
                  <Bar
                    data={actionsByTypeData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: chartTooltip },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: brandColors.darkGrey },
                          grid: { color: 'rgba(168, 178, 188, 0.45)' },
                        },
                        x: {
                          ticks: { color: brandColors.darkGrey },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </Box>
              ) : (
                <EmptyState title="No actions in range" message="Try a wider time range to see activity by type." />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">By Resource</Typography>
              </Box>
              {actionsByResourceData ? (
                <Box className="chart-canvas chart-canvas--donut">
                  <Doughnut
                    data={actionsByResourceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: brandColors.bloxBlack,
                            padding: 12,
                            usePointStyle: true,
                            font: { family: 'IBM Plex Sans', size: 12 },
                          },
                        },
                        tooltip: chartTooltip,
                      },
                    }}
                  />
                </Box>
              ) : (
                <EmptyState title="No resource data" message="No resource activity recorded for this range." />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">Top Active Users</Typography>
                <Chip label="Top 10" size="small" className="range-chip" />
              </Box>
              {topUsersData ? (
                <Box className="chart-canvas">
                  <Bar
                    data={topUsersData}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: chartTooltip },
                      scales: {
                        x: {
                          beginAtZero: true,
                          ticks: { color: brandColors.darkGrey },
                          grid: { color: 'rgba(168, 178, 188, 0.45)' },
                        },
                        y: {
                          ticks: { color: brandColors.darkGrey },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </Box>
              ) : (
                <EmptyState title="No user activity" message="User rankings will appear once actions are logged." />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">Leaderboard</Typography>
                <Timeline aria-hidden sx={{ color: 'var(--secondary-text)' }} />
              </Box>
              {stats.actionsByUser.length > 0 ? (
                <Box className="leaderboard">
                  {stats.actionsByUser.slice(0, 10).map((user, idx) => (
                    <Box key={user.userEmail} className="leaderboard-item">
                      <Box className="leaderboard-rank">
                        <Chip
                          label={idx + 1}
                          size="small"
                          sx={{
                            backgroundColor: idx < 3 ? brandColors.primary : brandColors.midGrey,
                            color: idx < 3 ? brandColors.bloxBlack : brandColors.bloxBlack,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Box className="leaderboard-info">
                        <Typography variant="body1" className="leaderboard-email" title={user.userEmail}>
                          {user.userEmail}
                        </Typography>
                        <Typography variant="caption" className="leaderboard-count">
                          {user.count} {user.count === 1 ? 'action' : 'actions'}
                        </Typography>
                      </Box>
                      <Box className="leaderboard-bar" aria-hidden>
                        <Box
                          className="leaderboard-bar-fill"
                          sx={{
                            width: `${(user.count / (stats.actionsByUser[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <EmptyState title="Leaderboard empty" message="No ranked users for this period." />
              )}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <EmptyState
          title="No activity data available"
          message="Stats will appear once platform events are logged."
          actionLabel="Retry"
          onAction={() => loadStats(true)}
        />
      )}
    </Box>
  );
};
