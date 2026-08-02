import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip, Tooltip, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  type Column,
  Button,
  StatusBadge,
  SearchBar,
  EmptyState,
  TableSkeleton,
  Card,
} from '@shared/components';
import { supabaseApiService } from '@shared/services';
import type { Application } from '@shared/models/application.model';
import {
  FINANCE_ACTIVATION_QUEUE_STATUSES,
  FINANCE_REVIEW_QUEUE_STATUSES,
  CREDIT_PIPELINE_STATUSES,
  formatCurrency,
} from '@shared/utils';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import { toast } from 'react-toastify';
import './FinanceQueuePage.scss';

const QUEUE_PAGE_SIZE = 100;

type MainTab = 'activation' | 'review';
type ReviewSubTab = 'pipeline' | 'rejected';

function queueAgeLabel(app: Application): string {
  const start = app.submittedAt || app.submissionDate || app.updatedAt || app.createdAt;
  if (!start) return '—';
  const ms = Date.now() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const FinanceQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [noDealerAssignment, setNoDealerAssignment] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('activation');
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTab>('pipeline');

  const statusIn = useMemo(
    () =>
      mainTab === 'activation'
        ? [...FINANCE_ACTIVATION_QUEUE_STATUSES]
        : [...FINANCE_REVIEW_QUEUE_STATUSES],
    [mainTab]
  );

  const load = useCallback(
    async (nextOffset = 0, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setLoadError(null);
        setNoDealerAssignment(false);

        const assignmentRes = await supabaseApiService.getMyFinanceAssignmentInfo();
        if (
          assignmentRes.status === 'SUCCESS' &&
          assignmentRes.data &&
          assignmentRes.data.financeScope !== 'all' &&
          assignmentRes.data.companyIds.length === 0
        ) {
          setNoDealerAssignment(true);
          setApps([]);
          setTruncated(false);
          setOffset(0);
          return;
        }

        const res = await supabaseApiService.getApplications({
          skipCache: true,
          lean: true,
          leanOmitInstallmentPlan: true,
          statusIn,
          limit: QUEUE_PAGE_SIZE,
          offset: nextOffset,
        });
        if (res.status !== 'SUCCESS' || !res.data) {
          throw new Error(res.message || 'Failed to load queue');
        }
        const sorted = [...res.data].sort((a, b) => {
          const ta = new Date(a.updatedAt || a.createdAt).getTime();
          const tb = new Date(b.updatedAt || b.createdAt).getTime();
          return tb - ta;
        });
        setApps((prev) => (append ? [...prev, ...sorted] : sorted));
        const loaded = nextOffset + sorted.length;
        const total = res.count ?? loaded;
        setTruncated(total > loaded);
        setOffset(loaded);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load queue';
        setLoadError(message);
        if (!append) setApps([]);
        toast.error(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusIn]
  );

  useEffect(() => {
    load(0, false);
  }, [load]);

  const filtered = apps.filter((app) => {
    if (mainTab === 'review') {
      if (reviewSubTab === 'rejected') {
        if (app.status !== 'rejected') return false;
      } else if (!CREDIT_PIPELINE_STATUSES.includes(app.status as (typeof CREDIT_PIPELINE_STATUSES)[number])) {
        return false;
      }
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      app.customerName?.toLowerCase().includes(q) ||
      app.customerEmail?.toLowerCase().includes(q) ||
      app.id?.toLowerCase().includes(q) ||
      app.company?.name?.toLowerCase().includes(q)
    );
  });

  const columns: Column<Application>[] = [
    {
      id: 'id',
      label: 'Application',
      format: (value) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {String(value || '').slice(0, 12)}…
        </Typography>
      ),
    },
    {
      id: 'customerName',
      label: 'Customer',
      format: (_value, row) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.customerName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.customerEmail}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'company',
      label: 'Dealership',
      format: (_value, row) =>
        row.company?.name ? (
          <Chip size="small" label={row.company.name} variant="outlined" />
        ) : (
          '—'
        ),
    },
    {
      id: 'vehicle',
      label: 'Vehicle',
      format: (_value, row) =>
        row.vehicle ? `${row.vehicle.make || ''} ${row.vehicle.model || ''}`.trim() : '—',
    },
    {
      id: 'loanAmount',
      label: 'Financing',
      format: (_value, row) => {
        const loan = Number(row.loanAmount) || 0;
        const dp = Number(row.downPayment) || 0;
        return (
          <Box>
            <Typography variant="body2" className="blox-numeric" sx={{ fontWeight: 600 }}>
              {formatCurrency(loan)}
            </Typography>
            <Typography variant="caption" color="text.secondary" className="blox-numeric">
              DP {formatCurrency(dp)}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      format: (value) => <StatusBadge status={String(value)} type="application" />,
    },
    {
      id: 'updatedAt',
      label: 'Waiting',
      format: (_value, row) => (
        <Tooltip title={row.updatedAt || ''}>
          <span>{queueAgeLabel(row)}</span>
        </Tooltip>
      ),
    },
  ];

  const emptyTitle =
    mainTab === 'activation'
      ? 'Activation queue is empty'
      : reviewSubTab === 'rejected'
        ? 'No rejected applications'
        : 'Review queue is empty';

  const emptyMessage =
    mainTab === 'activation'
      ? 'No applications are waiting for finance activation.'
      : reviewSubTab === 'rejected'
        ? 'Rejected applications you can reopen will appear here.'
        : 'No applications in the credit review pipeline right now.';

  return (
    <Box className="finance-queue-page">
      <Typography variant="h2" className="page-title">
        Queue
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review pipeline applications (credit-parity decisions) or activate financing for
        credit-approved deals.
      </Typography>

      <Tabs
        value={mainTab === 'activation' ? 0 : 1}
        onChange={(_, v) => setMainTab(v === 0 ? 'activation' : 'review')}
        sx={{ mb: 2 }}
      >
        <Tab label="Activation" />
        <Tab label="Review" />
      </Tabs>

      {mainTab === 'review' && (
        <Tabs
          value={reviewSubTab === 'pipeline' ? 0 : 1}
          onChange={(_, v) => setReviewSubTab(v === 0 ? 'pipeline' : 'rejected')}
          sx={{ mb: 2 }}
        >
          <Tab label="Pipeline" />
          <Tab label="Rejected" />
        </Tabs>
      )}

      <Card className="finance-queue-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search customer, dealership, application…"
        />
        <Button variant="secondary" onClick={() => load(0, false)}>
          Refresh
        </Button>
      </Card>

      {truncated && !loading && !loadError && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Showing {apps.length} applications. Load more to page through the queue.
        </Typography>
      )}

      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : loadError ? (
        <EmptyState
          title="Failed to load queue"
          message={loadError}
          actionLabel="Retry"
          onAction={() => load(0, false)}
        />
      ) : noDealerAssignment ? (
        <EmptyState
          title="No dealership assignment"
          message="Your finance account is scoped to assigned dealers, but none are linked yet. Ask an admin to assign you on the partner page."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <>
          <Table
            columns={columns}
            rows={filtered}
            onRowClick={(row) =>
              navigate(withPortalBase(portalBase, `/applications/view/${row.id}`))
            }
          />
          {truncated && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="secondary"
                disabled={loadingMore}
                onClick={() => load(offset, true)}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
