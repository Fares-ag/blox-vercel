import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Search,
  FilterList,
  Refresh,
  Visibility,
  GetApp,
} from '@mui/icons-material';
import { activityTrackingService, type ActivityLog, type ActionType, type ResourceType } from '@shared/services';
import { toast } from 'react-toastify';
import moment from 'moment';
import './ActivityLogsPage.scss';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [filters, setFilters] = useState({
    userEmail: '',
    actionType: '' as ActionType | '',
    resourceType: '' as ResourceType | '',
    startDate: '',
    endDate: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[ActivityLogsPage] Loading activity logs with filters:', filters);
      console.log('[ActivityLogsPage] Current page:', page, 'Limit:', limit);
      
      const result = await activityTrackingService.getActivityLogs({
        userEmail: filters.userEmail || undefined,
        actionType: filters.actionType || undefined,
        resourceType: filters.resourceType || undefined,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        limit,
        offset: (page - 1) * limit,
      });
      
      console.log('[ActivityLogsPage] Activity logs result:', result);
      console.log('[ActivityLogsPage] Data length:', result.data?.length || 0, 'Total:', result.total || 0);
      
      setLogs(result.data || []);
      setTotal(result.total || 0);
      
      if ((result.data || []).length === 0 && (result.total || 0) === 0) {
        console.log('[ActivityLogsPage] No activity logs found. This could mean:');
        console.log('  1. No activities have been logged yet');
        console.log('  2. RLS policy is blocking access');
        console.log('  3. User is not recognized as super_admin');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load activity logs';
      console.error('[ActivityLogsPage] Failed to load activity logs:', error);
      console.error('[ActivityLogsPage] Error details:', error);
      toast.error(errorMessage);
      setLogs([]);
      setTotal(0);
    } finally {
      console.log('[ActivityLogsPage] Setting loading to false');
      setLoading(false);
    }
  }, [filters.userEmail, filters.actionType, filters.resourceType, filters.startDate, filters.endDate, page, limit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilter = () => {
    setPage(1);
    // loadLogs will be called automatically via useEffect when filters change
  };

  const handleReset = () => {
    setFilters({
      userEmail: '',
      actionType: '',
      resourceType: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const getActionColor = (action: ActionType): string => {
    switch (action) {
      case 'create':
        return '#DAFF01'; // Lime Yellow
      case 'update':
        return '#B8D900'; // Darker Yellow
      case 'delete':
        return '#787663'; // Dark Grey
      case 'view':
        return '#C9C4B7'; // Mid Grey
      case 'login':
      case 'logout':
        return '#DAFF01'; // Lime Yellow
      case 'approve':
        return '#DAFF01'; // Lime Yellow
      case 'reject':
        return '#0E1909'; // Blox Black
      default:
        return '#787663'; // Dark Grey
    }
  };

  const getRoleColor = (role?: string): string => {
    switch (role) {
      case 'super_admin':
        return '#0E1909'; // Blox Black
      case 'admin':
        return '#787663'; // Dark Grey
      case 'customer':
        return '#DAFF01'; // Lime Yellow
      default:
        return '#C9C4B7'; // Mid Grey
    }
  };

  const getRoleTextColor = (role?: string): string => {
    switch (role) {
      case 'super_admin':
        return '#DAFF01'; // Lime Yellow text on black
      case 'admin':
        return '#F3F0ED'; // Light Grey text
      case 'customer':
        return '#0E1909'; // Blox Black text
      default:
        return '#0E1909'; // Blox Black text
    }
  };

  return (
    <Box className="activity-logs-page">
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Activity Logs
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            Monitor all user actions across the application
          </Typography>
        </Box>
        <Box className="page-actions">
          <Tooltip title="Refresh">
            <IconButton onClick={loadLogs} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton onClick={handleExport} size="small">
              <GetApp />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="h4" className="summary-value">
                {total.toLocaleString()}
              </Typography>
              <Typography variant="body2" className="summary-label">
                Total Logs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="h4" className="summary-value">
                {new Set(logs.map(l => l.userEmail)).size}
              </Typography>
              <Typography variant="body2" className="summary-label">
                Unique Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="h4" className="summary-value">
                {new Set(logs.map(l => l.actionType)).size}
              </Typography>
              <Typography variant="body2" className="summary-label">
                Action Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="h4" className="summary-value">
                {new Set(logs.map(l => l.resourceType)).size}
              </Typography>
              <Typography variant="body2" className="summary-label">
                Resource Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper className="filters-card">
        <Box className="filters-header">
          <FilterList sx={{ mr: 1 }} />
          <Typography variant="h5">Filters</Typography>
        </Box>
        <Box className="filters-content">
          <TextField
            label="User Email"
            value={filters.userEmail}
            onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
            size="small"
            sx={{ minWidth: 200 }}
            placeholder="Search by email..."
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Action Type</InputLabel>
            <Select
              value={filters.actionType}
              onChange={(e) => setFilters({ ...filters, actionType: e.target.value as ActionType })}
              label="Action Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="create">Create</MenuItem>
              <MenuItem value="update">Update</MenuItem>
              <MenuItem value="delete">Delete</MenuItem>
              <MenuItem value="view">View</MenuItem>
              <MenuItem value="login">Login</MenuItem>
              <MenuItem value="logout">Logout</MenuItem>
              <MenuItem value="approve">Approve</MenuItem>
              <MenuItem value="reject">Reject</MenuItem>
              <MenuItem value="upload">Upload</MenuItem>
              <MenuItem value="download">Download</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Resource Type</InputLabel>
            <Select
              value={filters.resourceType}
              onChange={(e) => setFilters({ ...filters, resourceType: e.target.value as ResourceType })}
              label="Resource Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="application">Application</MenuItem>
              <MenuItem value="product">Product</MenuItem>
              <MenuItem value="offer">Offer</MenuItem>
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="payment">Payment</MenuItem>
              <MenuItem value="document">Document</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleFilter}
            className="filter-button"
          >
            Filter
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} className="logs-table-container">
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow className="table-header-row">
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Resource Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No activity logs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} hover className="log-row">
                      <TableCell>
                        <Typography variant="body2" className="time-cell">
                          {log.createdAt ? moment(log.createdAt).format('MMM DD, YYYY') : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.createdAt ? moment(log.createdAt).format('HH:mm:ss') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="email-cell">
                          {log.userEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.userRole || 'unknown'}
                          size="small"
                          sx={{
                            backgroundColor: getRoleColor(log.userRole),
                            color: getRoleTextColor(log.userRole),
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.actionType}
                          size="small"
                          sx={{
                            backgroundColor: getActionColor(log.actionType),
                            color: log.actionType === 'reject' ? '#F3F0ED' : '#0E1909',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.resourceType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="resource-name">
                          {log.resourceName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="description-cell">
                          {log.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {total > limit && (
              <Box display="flex" justifyContent="center" p={2}>
                <Pagination
                  count={Math.ceil(total / limit)}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </TableContainer>

      {/* Details Dialog */}
      {selectedLog && (
        <Paper
          className="log-details-dialog"
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 1300,
            p: 3,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <Typography variant="h5" gutterBottom>
            Activity Details
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Time:</strong> {selectedLog.createdAt ? moment(selectedLog.createdAt).format('MMMM DD, YYYY HH:mm:ss') : '-'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>User:</strong> {selectedLog.userEmail} ({selectedLog.userRole})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Action:</strong> {selectedLog.actionType}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Resource:</strong> {selectedLog.resourceType} - {selectedLog.resourceName || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Description:</strong> {selectedLog.description}
            </Typography>
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Metadata:</strong>
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#F3F0ED' }}>
                  <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};
