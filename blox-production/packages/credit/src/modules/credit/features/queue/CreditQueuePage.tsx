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
import { CREDIT_QUEUE_STATUSES, CREDIT_PIPELINE_STATUSES, formatCurrency } from '@shared/utils';
import { usePortalBasePath, withPortalBase } from '@shared/contexts/portal-base-path';
import { toast } from 'react-toastify';
import './CreditQueuePage.scss';

const QUEUE_PAGE_SIZE = 100;

type QueueTab = 'pipeline' | 'rejected';

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

export const CreditQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBasePath();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>('pipeline');
  const [truncated, setTruncated] = useState(false);
  const [noDealerAssignment, setNoDealerAssignment] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (nextOffset = 0, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setLoadError(null);
      setNoDealerAssignment(false);

      const assignmentRes = await supabaseApiService.getMyCreditAssignmentInfo();
      if (
        assignmentRes.status === 'SUCCESS' &&
        assignmentRes.data &&
        assignmentRes.data.creditScope !== 'all' &&
        assignmentRes.data.companyIds.length === 0
      ) {
        setNoDealerAssignment(true);
        setApps([]);
        setAgentNames({});
        setTruncated(false);
        setOffset(0);
        return;
      }

      const res = await supabaseApiService.getApplications({
        skipCache: true,
        lean: true,
        leanOmitInstallmentPlan: true,
        statusIn: [...CREDIT_QUEUE_STATUSES],
        limit: QUEUE_PAGE_SIZE,
        offset: nextOffset,
      });
      if (res.status !== 'SUCCESS' || !res.data) {
        throw new Error(res.message || 'Failed to load credit queue');
      }
      const pipeline = [...res.data].sort((a, b) => {
        const ta = new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime();
        const tb = new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime();
        return tb - ta;
      });
      setApps((prev) => (append ? [...prev, ...pipeline] : pipeline));
      const loaded = nextOffset + pipeline.length;
      const total = res.count ?? loaded;
      setTruncated(total > loaded);
      setOffset(loaded);

      const agentIds = [...new Set(pipeline.map((a) => a.agentUserId).filter(Boolean))] as string[];
      if (agentIds.length > 0) {
        try {
          const namesRes = await supabaseApiService.getUserDisplayNamesByIds(agentIds);
          if (namesRes.status === 'SUCCESS' && namesRes.data) {
            setAgentNames((prev) => (append ? { ...prev, ...namesRes.data } : namesRes.data));
          }
        } catch {
          // optional
        }
      } else if (!append) {
        setAgentNames({});
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load credit queue';
      setLoadError(message);
      if (!append) setApps([]);
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(0, false);
  }, [load]);

  const tabApps = useMemo(() => {
    if (queueTab === 'rejected') {
      return apps.filter((a) => a.status === 'rejected');
    }
    const pipelineSet = new Set<string>(CREDIT_PIPELINE_STATUSES);
    return apps.filter((a) => pipelineSet.has(a.status));
  }, [apps, queueTab]);

  const filtered = tabApps.filter((app) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const agent = app.agentUserId ? agentNames[app.agentUserId] || '' : '';
    return (
      app.customerName?.toLowerCase().includes(q) ||
      app.customerEmail?.toLowerCase().includes(q) ||
      app.id?.toLowerCase().includes(q) ||
      agent.toLowerCase().includes(q) ||
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
      id: 'agentUserId',
      label: 'Agent',
      format: (value) => {
        const id = value as string | undefined;
        return id ? agentNames[id] || String(id).slice(0, 8) : '—';
      },
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
      id: 'sellingPrice',
      label: 'Deal',
      format: (_value, row) => {
        const selling = Number(row.sellingPrice ?? row.vehicle?.price) || 0;
        const rate =
          row.internalAnnualRate != null
            ? Number(row.internalAnnualRate) <= 1
              ? Number(row.internalAnnualRate) * 100
              : Number(row.internalAnnualRate)
            : null;
        return (
          <Box>
            <Typography variant="body2" className="blox-numeric" sx={{ fontWeight: 600 }}>
              {formatCurrency(selling)}
            </Typography>
            {rate != null && (
              <Typography variant="caption" color="text.secondary" className="blox-numeric">
                {rate.toFixed(1)}% internal
              </Typography>
            )}
            {row.hideInterest && (
              <Chip size="small" label="Customer: 0%" sx={{ mt: 0.5, height: 22, fontSize: 11 }} />
            )}
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
      id: 'submittedAt',
      label: 'In queue',
      format: (_value, row) => (
        <Tooltip title={row.submittedAt || row.updatedAt || ''}>
          <span>{queueAgeLabel(row)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box className="credit-queue-page">
      <Typography variant="h2" className="page-title">
        Credit Queue
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Submitted applications awaiting credit decisions. Drafts are hidden.
      </Typography>

      <Card className="credit-queue-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search customer, agent, application…"
        />
        <Button variant="secondary" onClick={() => load(0, false)}>
          Refresh
        </Button>
      </Card>

      <Tabs
        value={queueTab === 'pipeline' ? 0 : 1}
        onChange={(_, v) => setQueueTab(v === 0 ? 'pipeline' : 'rejected')}
        sx={{ mb: 2 }}
      >
        <Tab label="Pipeline" />
        <Tab label="Rejected" />
      </Tabs>

      {truncated && !loading && !loadError && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Showing {apps.length} applications. Load more to page through the queue.
        </Typography>
      )}

      {loading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : loadError ? (
        <EmptyState
          title="Failed to load queue"
          message={loadError}
          actionLabel="Retry"
          onAction={() => load(0, false)}
        />
      ) : noDealerAssignment ? (
        <EmptyState
          title="No dealers assigned"
          message="Ask a BLOX admin to assign you to one or more partners in Partner Hub."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={queueTab === 'rejected' ? 'No rejected applications' : 'Queue is empty'}
          message={
            queueTab === 'rejected'
              ? 'Rejected applications you can reopen will appear here.'
              : 'No applications in the credit pipeline right now.'
          }
        />
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
