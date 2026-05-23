import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { activityTrackingService } from '@shared/services';
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
  Tooltip,
  Legend,
  Filler
);

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
        return {
          startDate: moment().subtract(7, 'days').toDate(),
          endDate: new Date(),
        };
      case '30d':
        return {
          startDate: moment().subtract(30, 'days').toDate(),
          endDate: new Date(),
        };
      case '90d':
        return {
          startDate: moment().subtract(90, 'days').toDate(),
          endDate: new Date(),
        };
      default:
        return {
          startDate: undefined,
          endDate: undefined,
        };
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const range = getDateRange(dateRange);
      const result = await activityTrackingService.getActivityStats(range);
      setStats(result);
    } catch (error) {
      console.error('Failed to load activity stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Brand colors
  const brandColors = {
    primary: '#DAFF01',      // Lime Yellow
    primaryDark: '#B8D900',
    bloxBlack: '#0E1909',
    darkGrey: '#787663',
    midGrey: '#C9C4B7',
    lightGrey: '#F3F0ED',
  };

  const actionsByTypeData = stats ? {
    labels: Object.keys(stats.actionsByType),
    datasets: [
      {
        label: 'Actions',
        data: Object.values(stats.actionsByType),
        backgroundColor: [
          brandColors.primary,      // Lime Yellow for create
          brandColors.primaryDark,  // Darker yellow for update
          brandColors.darkGrey,     // Dark grey for delete
          brandColors.midGrey,      // Mid grey for view
          brandColors.primary,      // Lime Yellow for login
        ],
        borderColor: brandColors.bloxBlack,
        borderWidth: 1,
      },
    ],
  } : null;

  const actionsByResourceData = stats ? {
    labels: Object.keys(stats.actionsByResource),
    datasets: [
      {
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
      },
    ],
  } : null;

  const topUsersData = stats ? {
    labels: stats.actionsByUser.slice(0, 10).map(u => u.userEmail.split('@')[0]),
    datasets: [
      {
        label: 'Actions',
        data: stats.actionsByUser.slice(0, 10).map(u => u.count),
        backgroundColor: brandColors.primary,
        borderColor: brandColors.bloxBlack,
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <Box className="super-admin-dashboard">
      <Box className="dashboard-header">
        <Box>
          <Typography variant="h2" className="dashboard-title">
            Super Admin Dashboard
          </Typography>
          <Typography variant="body2" className="dashboard-subtitle">
            Monitor all user activities across the platform
          </Typography>
        </Box>
        <Box className="dashboard-controls">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
              label="Time Range"
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadStats} size="small" sx={{ ml: 1 }}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : stats ? (
        <Grid container spacing={3}>
          {/* Stat Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stat-card stat-card-primary">
              <CardContent>
                <Box className="stat-icon">
                  <Assessment />
                </Box>
                <Typography variant="h3" className="stat-value">
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
                <Box className="stat-icon">
                  <People />
                </Box>
                <Typography variant="h3" className="stat-value">
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
                <Box className="stat-icon">
                  <Description />
                </Box>
                <Typography variant="h3" className="stat-value">
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
                <Box className="stat-icon">
                  <TrendingUp />
                </Box>
                <Typography variant="h3" className="stat-value">
                  {Object.keys(stats.actionsByType).length}
                </Typography>
                <Typography variant="body2" className="stat-label">
                  Action Types
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={8}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">Actions by Type</Typography>
                <Chip label={dateRange} size="small" />
              </Box>
              {actionsByTypeData && (
                <Bar
                  data={actionsByTypeData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: brandColors.bloxBlack,
                        titleColor: brandColors.primary,
                        bodyColor: brandColors.lightGrey,
                        borderColor: brandColors.primary,
                        borderWidth: 1,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: brandColors.darkGrey,
                        },
                        grid: {
                          color: brandColors.midGrey,
                        },
                      },
                      x: {
                        ticks: {
                          color: brandColors.darkGrey,
                        },
                        grid: {
                          display: false,
                        },
                      },
                    },
                  }}
                />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">Actions by Resource</Typography>
              </Box>
              {actionsByResourceData && (
                <Box sx={{ height: '300px', position: 'relative' }}>
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
                            padding: 15,
                            usePointStyle: true,
                          },
                        },
                        tooltip: {
                          backgroundColor: brandColors.bloxBlack,
                          titleColor: brandColors.primary,
                          bodyColor: brandColors.lightGrey,
                          borderColor: brandColors.primary,
                          borderWidth: 1,
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Top Users */}
          <Grid item xs={12} md={6}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">Top Active Users</Typography>
                <Chip label="Top 10" size="small" />
              </Box>
              {topUsersData && (
                <Box sx={{ height: '300px' }}>
                  <Bar
                    data={topUsersData}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          backgroundColor: brandColors.bloxBlack,
                          titleColor: brandColors.primary,
                          bodyColor: brandColors.lightGrey,
                          borderColor: brandColors.primary,
                          borderWidth: 1,
                        },
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          ticks: {
                            color: brandColors.darkGrey,
                          },
                          grid: {
                            color: brandColors.midGrey,
                          },
                        },
                        y: {
                          ticks: {
                            color: brandColors.darkGrey,
                          },
                          grid: {
                            display: false,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Top Users List */}
          <Grid item xs={12} md={6}>
            <Paper className="chart-card">
              <Box className="chart-header">
                <Typography variant="h4">User Activity Leaderboard</Typography>
                <Timeline />
              </Box>
              <Box className="leaderboard">
                {stats.actionsByUser.slice(0, 10).map((user, idx) => (
                  <Box key={idx} className="leaderboard-item">
                    <Box className="leaderboard-rank">
                      <Chip
                        label={idx + 1}
                        size="small"
                        sx={{
                          backgroundColor: idx < 3 ? brandColors.primary : brandColors.midGrey,
                          color: idx < 3 ? brandColors.bloxBlack : brandColors.lightGrey,
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Box className="leaderboard-info">
                      <Typography variant="body1" className="leaderboard-email">
                        {user.userEmail}
                      </Typography>
                      <Typography variant="caption" className="leaderboard-count">
                        {user.count} {user.count === 1 ? 'action' : 'actions'}
                      </Typography>
                    </Box>
                    <Box className="leaderboard-bar">
                      <Box
                        className="leaderboard-bar-fill"
                        sx={{
                          width: `${(user.count / (stats.actionsByUser[0]?.count || 1)) * 100}%`,
                          backgroundColor: brandColors.primary,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No activity data available
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
