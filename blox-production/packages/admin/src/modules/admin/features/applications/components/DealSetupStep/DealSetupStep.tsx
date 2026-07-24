import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Input, Select, type SelectOption, type StepProps, Loading } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import { useAppSelector } from '../../../../store/hooks';
import type { User } from '@shared/models/user.model';
import { formatCurrency } from '@shared/utils';
import './DealSetupStep.scss';

/**
 * Agent ownership + negotiated selling price (showroom flow).
 * Place after vehicle selection so catalog list price is known;
 * InstallmentPlanStep then uses vehicle.price (= selling price).
 */
export const DealSetupStep: React.FC<StepProps> = ({ data, updateData }) => {
  const { user } = useAppSelector((state) => state.auth);
  const role = (user?.role || '').toLowerCase();
  const isDealer = role === 'dealer_agent';
  const isStaff = role === 'admin' || role === 'super_admin' || isDealer;

  const [agents, setAgents] = useState<User[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const listPrice = Number(data.listPrice ?? data.vehicle?.price) || 0;
  const sellingPrice =
    data.sellingPrice != null ? Number(data.sellingPrice) : listPrice || 0;
  const agentUserId = data.agentUserId || user?.id || '';

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    (async () => {
      setLoadingAgents(true);
      try {
        // Prefer direct users SELECT (RLS allows same-company dealers / admins).
        const { data: rows, error } = await supabase
          .from('users')
          .select('id, email, role, name, first_name, last_name, company_id')
          .in('role', ['dealer_agent', 'admin', 'super_admin']);

        if (!error && rows && rows.length > 0) {
          const mapped = rows.map(
            (r: any) =>
              ({
                id: r.id,
                email: r.email,
                role: r.role,
                name:
                  r.name ||
                  `${r.first_name || ''} ${r.last_name || ''}`.trim() ||
                  r.email,
                firstName: r.first_name,
                lastName: r.last_name,
                companyId: r.company_id,
              }) as User
          );
          const dealers = mapped.filter((u) => {
            const r = (u.role || '').toLowerCase();
            if (r === 'dealer_agent') return true;
            if (
              (role === 'admin' || role === 'super_admin') &&
              (r === 'admin' || r === 'super_admin')
            ) {
              return true;
            }
            return false;
          });
          if (!cancelled) {
            setAgents(
              dealers.length > 0
                ? dealers
                : mapped.filter((u) => u.id === user?.id)
            );
          }
          return;
        }

        const res = await supabaseApiService.getUsers();
        if (cancelled) return;
        if (res.status === 'SUCCESS' && res.data) {
          const dealers = res.data.filter((u) => {
            const r = (u.role || '').toLowerCase();
            if (r === 'dealer_agent') return true;
            if (
              (role === 'admin' || role === 'super_admin') &&
              (r === 'admin' || r === 'super_admin' || r === 'dealer_agent')
            ) {
              return true;
            }
            return false;
          });
          setAgents(dealers.length > 0 ? dealers : res.data.filter((u) => u.id === user?.id));
        } else if (user) {
          setAgents([user as User]);
        }
      } catch {
        if (!cancelled && user) setAgents([user as User]);
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff, role, user?.id]);

  useEffect(() => {
    const patch: Record<string, unknown> = {};
    if (!data.agentUserId && user?.id) patch.agentUserId = user.id;
    if (data.listPrice == null && data.vehicle?.price != null) {
      patch.listPrice = Number(data.vehicle.price);
    }
    if (data.sellingPrice == null && data.vehicle?.price != null) {
      const price = Number(data.vehicle.price);
      patch.sellingPrice = price;
      patch.vehicle = { ...data.vehicle, price };
    }
    if (Object.keys(patch).length) updateData(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.vehicle?.id]);

  const agentOptions: SelectOption[] = agents.map((a) => {
    const name = (a.name || `${a.firstName || ''} ${a.lastName || ''}`).trim() || a.email;
    return { value: a.id, label: `${name} (${a.email})` };
  });

  const applySellingPrice = (price: number) => {
    const vehicle = data.vehicle ? { ...data.vehicle, price } : data.vehicle;
    updateData({
      sellingPrice: price,
      listPrice: data.listPrice ?? listPrice,
      vehicle,
    });
  };

  if (!isStaff) {
    return (
      <Box className="deal-setup-step">
        <Typography>Deal setup is only available for staff users.</Typography>
      </Box>
    );
  }

  return (
    <Box className="deal-setup-step">
      <Typography variant="h3" className="section-title">
        Deal setup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Assign the agent and set the negotiated selling price for this customer.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Agent in charge
        </Typography>
        {loadingAgents ? (
          <Loading />
        ) : (
          <Select
            label="Agent"
            value={agentUserId}
            onChange={(e) => updateData({ agentUserId: e.target.value as string })}
            options={agentOptions}
            helperText="Which showroom agent owns this application"
          />
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Pricing
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Catalog list price
            </Typography>
            <Typography variant="h6">{formatCurrency(listPrice)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Input
              label="Selling price (QAR)"
              type="number"
              value={String(sellingPrice || '')}
              onChange={(e) => applySellingPrice(parseFloat(e.target.value) || 0)}
              helperText="Can differ from catalog for this customer"
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};
