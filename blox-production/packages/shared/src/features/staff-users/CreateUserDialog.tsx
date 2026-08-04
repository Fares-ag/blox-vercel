import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { Button } from '../../components/core/Button/Button';
import { supabaseApiService } from '../../services/supabase-api.service';
import { supabase } from '../../services/supabase.service';
import type { Company } from '../../models';
import { toast } from 'react-toastify';

export type StaffUserRole =
  | 'customer'
  | 'dealer_agent'
  | 'credit_officer'
  | 'finance_officer'
  | 'admin'
  | 'super_admin';

const ALL_ROLES: { value: StaffUserRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'dealer_agent', label: 'Dealer agent' },
  { value: 'credit_officer', label: 'Credit officer' },
  { value: 'finance_officer', label: 'Finance officer' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super admin' },
];

export interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (user: { id: string; email: string; role: string }) => void;
  /** When true, include super_admin in the role select. */
  allowSuperAdminRole?: boolean;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onClose,
  onCreated,
  allowSuperAdminRole = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<StaffUserRole>('dealer_agent');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [resolvedAllowSuper, setResolvedAllowSuper] = useState(allowSuperAdminRole);

  const roleOptions = useMemo(
    () =>
      ALL_ROLES.filter((r) => r.value !== 'super_admin' || resolvedAllowSuper),
    [resolvedAllowSuper]
  );

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setRole('dealer_agent');
    setCompanyId('');
  }, []);

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    setResolvedAllowSuper(allowSuperAdminRole);
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        const callerRole = String(data?.role || '').toLowerCase();
        if (callerRole === 'super_admin') {
          setResolvedAllowSuper(true);
        }
      } catch {
        // keep prop default
      }
    })();
    void (async () => {
      const res = await supabaseApiService.getCompanies();
      if (res.status === 'SUCCESS' && res.data) {
        setCompanies(res.data);
      }
    })();
  }, [open, allowSuperAdminRole]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const res = await supabaseApiService.createUser({
        email: trimmedEmail,
        password,
        role,
        companyId: companyId || null,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      if (res.status !== 'SUCCESS' || !res.data?.id) {
        throw new Error(res.message || 'Failed to create user');
      }
      toast.success(`Created ${res.data.email} (${res.data.role})`);
      onCreated?.(res.data);
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create user</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates a confirmed Auth account and sets their portal role. Share the password securely.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoFocus
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
            />
          </Box>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText="At least 8 characters"
          />
          <TextField
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="create-user-role-label">Role</InputLabel>
            <Select
              labelId="create-user-role-label"
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffUserRole)}
            >
              {roleOptions.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="create-user-company-label">Company (optional)</InputLabel>
            <Select
              labelId="create-user-company-label"
              label="Company (optional)"
              value={companyId}
              onChange={(e) => setCompanyId(String(e.target.value))}
            >
              <MenuItem value="">No company</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                  {c.code ? ` (${c.code})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="secondary" onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>
          Create user
        </Button>
      </DialogActions>
    </Dialog>
  );
};
