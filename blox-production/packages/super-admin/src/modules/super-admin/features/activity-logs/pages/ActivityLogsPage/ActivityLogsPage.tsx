import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Search,
  FilterList,
  Refresh,
  Visibility,
  GetApp,
  Close,
} from '@mui/icons-material';
import {
  activityTrackingService,
  type ActivityLog,
  type ActionType,
  type ResourceType,
} from '@shared/services';
import { Button, Input, Select, EmptyState, TableSkeleton } from '@shared/components';
import { toast } from 'react-toastify';
import moment from 'moment';
import './ActivityLogsPage.scss';

type Filters = {
  userEmail: string;
  actionType: ActionType | '';
  resourceType: ResourceType | '';
  startDate: string;
  endDate: string;
};

const emptyFilters: Filters = {
  userEmail: '',
  actionType: '',
  resourceType: '',
  startDate: '',
  endDate: '',
};

const actionOptions = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'view', label: 'View' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'upload', label: 'Upload' },
  { value: 'download', label: 'Download' },
];

const resourceOptions = [
  { value: '', label: 'All resources' },
  { value: 'application', label: 'Application' },
  { value: 'product', label: 'Product' },
  { value: 'offer', label: 'Offer' },
  { value: 'user', label: 'User' },
  { value: 'payment', label: 'Payment' },
  { value: 'document', label: 'Document' },
];

const getActionColor = (action: ActionType): string => {
  switch (action) {
    case 'create':
    case 'login':
    case 'logout':
    case 'approve':
      return 'var(--primary-color)';
    case 'update':
      return 'var(--primary-dark)';
    case 'reject':
      return 'var(--blox-black)';
    case 'delete':
      return 'var(--dark-grey)';
    case 'view':
      return 'var(--mid-grey)';
    default:
      return 'var(--dark-grey)';
  }
};

const getActionTextColor = (action: ActionType): string =>
  action === 'reject' ? 'var(--light-grey)' : 'var(--blox-black)';

const getRoleColor = (role?: string): string => {
  switch (role) {
    case 'super_admin':
      return 'var(--blox-black)';
    case 'admin':
      return 'var(--dark-grey)';
    case 'customer':
      return 'var(--primary-color)';
    default:
      return 'var(--mid-grey)';
  }
};

const getRoleTextColor = (role?: string): string => {
  switch (role) {
    case 'super_admin':
      return 'var(--primary-color)';
    case 'admin':
      return 'var(--light-grey)';
    default:
      return 'var(--blox-black)';
  }
};

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);

  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await activityTrackingService.getActivityLogs({
        userEmail: appliedFilters.userEmail || undefined,
        actionType: appliedFilters.actionType || undefined,
        resourceType: appliedFilters.resourceType || undefined,
        startDate: appliedFilters.startDate ? new Date(appliedFilters.startDate) : undefined,
        endDate: appliedFilters.endDate ? new Date(appliedFilters.endDate) : undefined,
        limit,
        offset: (page - 1) * limit,
      });

      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load activity logs';
      toast.error(errorMessage);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedFilters, page, limit]);

  useEffect(() => {
    loadLogs(false);
  }, [loadLogs]);

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const handleReset = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <Box className="activity-logs-page">
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Activity Logs
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            Audit trail of user actions across the platform
          </Typography>
        </Box>
        <Box className="page-actions">
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={() => loadLogs(true)}
                size="small"
                aria-label="Refresh activity logs"
                disabled={loading || refreshing}
                className="page-icon-btn"
              >
                <Refresh className={refreshing ? 'spin' : undefined} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton
              onClick={handleExport}
              size="small"
              aria-label="Export activity logs"
              className="page-icon-btn"
            >
              <GetApp />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} className="summary-grid">
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
                {new Set(logs.map((l) => l.userEmail)).size}
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
                {new Set(logs.map((l) => l.actionType)).size}
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
                {new Set(logs.map((l) => l.resourceType)).size}
              </Typography>
              <Typography variant="body2" className="summary-label">
                Resource Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper className="filters-card">
        <Box className="filters-header">
          <FilterList sx={{ mr: 1, fontSize: 20 }} aria-hidden />
          <Typography variant="h5">Filters</Typography>
        </Box>
        <Box className="filters-grid">
          <Input
            label="User Email"
            value={draftFilters.userEmail}
            onChange={(e) => setDraftFilters({ ...draftFilters, userEmail: e.target.value })}
            placeholder="Search by email..."
            className="filter-field"
          />
          <Select
            label="Action Type"
            size="small"
            value={draftFilters.actionType}
            options={actionOptions}
            onChange={(e) =>
              setDraftFilters({ ...draftFilters, actionType: e.target.value as ActionType | '' })
            }
            className="filter-field"
          />
          <Select
            label="Resource Type"
            size="small"
            value={draftFilters.resourceType}
            options={resourceOptions}
            onChange={(e) =>
              setDraftFilters({
                ...draftFilters,
                resourceType: e.target.value as ResourceType | '',
              })
            }
            className="filter-field"
          />
          <Input
            label="Start Date"
            type="date"
            value={draftFilters.startDate}
            onChange={(e) => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            className="filter-field"
          />
          <Input
            label="End Date"
            type="date"
            value={draftFilters.endDate}
            onChange={(e) => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            className="filter-field"
          />
          <Box className="filter-actions">
            <Button variant="primary" startIcon={<Search />} onClick={handleApplyFilters}>
              Apply
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} className="logs-table-container">
        {loading ? (
          <Box className="table-loading">
            <TableSkeleton rows={8} columns={8} />
          </Box>
        ) : logs.length === 0 ? (
          <Box className="table-empty">
            <EmptyState
              title="No activity logs found"
              message="Try adjusting filters or wait for new platform activity."
              actionLabel="Reset filters"
              onAction={handleReset}
            />
          </Box>
        ) : (
          <>
            <Table stickyHeader size="small" className="logs-table">
              <TableHead>
                <TableRow className="table-header-row">
                  <TableCell width={120}>Time</TableCell>
                  <TableCell width={180}>User</TableCell>
                  <TableCell width={110}>Role</TableCell>
                  <TableCell width={110}>Action</TableCell>
                  <TableCell width={110}>Resource</TableCell>
                  <TableCell width={140}>Resource Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell width={72} align="center">
                    Details
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow
                    key={log.id}
                    className={`log-row ${index % 2 === 1 ? 'log-row--alt' : ''}`}
                  >
                    <TableCell>
                      <Typography variant="body2" className="time-cell">
                        {log.createdAt ? moment(log.createdAt).format('MMM DD, YYYY') : '-'}
                      </Typography>
                      <Typography variant="caption" className="time-meta">
                        {log.createdAt ? moment(log.createdAt).format('HH:mm:ss') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.userEmail}>
                        <Typography variant="body2" className="email-cell">
                          {log.userEmail}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.userRole || 'unknown'}
                        size="small"
                        className="brand-chip"
                        sx={{
                          backgroundColor: getRoleColor(log.userRole),
                          color: getRoleTextColor(log.userRole),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.actionType}
                        size="small"
                        className="brand-chip"
                        sx={{
                          backgroundColor: getActionColor(log.actionType),
                          color: getActionTextColor(log.actionType),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.resourceType}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.resourceName || '-'}>
                        <Typography variant="body2" className="resource-name">
                          {log.resourceName || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.description || ''}>
                        <Typography variant="body2" className="description-cell">
                          {log.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          aria-label={`View details for ${log.actionType} by ${log.userEmail}`}
                          onClick={() => setSelectedLog(log)}
                          className="details-btn"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {total > limit && (
              <Box className="pagination-bar">
                <Typography variant="caption" className="pagination-meta">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </Typography>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  shape="rounded"
                  siblingCount={0}
                  boundaryCount={1}
                />
              </Box>
            )}
          </>
        )}
      </TableContainer>

      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        fullWidth
        maxWidth="sm"
        className="log-details-dialog"
        aria-labelledby="activity-details-title"
      >
        {selectedLog && (
          <>
            <DialogTitle id="activity-details-title" className="dialog-title">
              Activity Details
              <IconButton
                aria-label="Close details"
                onClick={() => setSelectedLog(null)}
                className="dialog-close"
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent className="dialog-content" dividers>
              <Box className="detail-grid">
                <Box className="detail-row">
                  <Typography variant="caption" className="detail-label">
                    Time
                  </Typography>
                  <Typography variant="body2" className="detail-value">
                    {selectedLog.createdAt
                      ? moment(selectedLog.createdAt).format('MMMM DD, YYYY HH:mm:ss')
                      : '-'}
                  </Typography>
                </Box>
                <Box className="detail-row">
                  <Typography variant="caption" className="detail-label">
                    User
                  </Typography>
                  <Typography variant="body2" className="detail-value">
                    {selectedLog.userEmail} ({selectedLog.userRole})
                  </Typography>
                </Box>
                <Box className="detail-row">
                  <Typography variant="caption" className="detail-label">
                    Action
                  </Typography>
                  <Typography variant="body2" className="detail-value">
                    {selectedLog.actionType}
                  </Typography>
                </Box>
                <Box className="detail-row">
                  <Typography variant="caption" className="detail-label">
                    Resource
                  </Typography>
                  <Typography variant="body2" className="detail-value">
                    {selectedLog.resourceType} — {selectedLog.resourceName || 'N/A'}
                  </Typography>
                </Box>
                <Box className="detail-row">
                  <Typography variant="caption" className="detail-label">
                    Description
                  </Typography>
                  <Typography variant="body2" className="detail-value">
                    {selectedLog.description}
                  </Typography>
                </Box>
              </Box>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <Box className="metadata-block">
                  <Typography variant="caption" className="detail-label">
                    Metadata
                  </Typography>
                  <Paper className="metadata-paper" elevation={0}>
                    <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions className="dialog-actions">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
