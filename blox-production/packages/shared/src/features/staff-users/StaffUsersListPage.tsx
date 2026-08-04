import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabaseApiService } from '../../services/supabase-api.service';
import { supabase } from '../../services/supabase.service';
import type { User } from '../../models/user.model';
import { Table, type Column } from '../../components/shared/Table/Table';
import { SearchBar } from '../../components/shared/SearchBar/SearchBar';
import { Button } from '../../components/core/Button/Button';
import { EmptyState } from '../../components/shared/EmptyState/EmptyState';
import { TableSkeleton } from '../../components/shared/Skeleton/Skeleton';
import { formatDateTable } from '../../utils/formatters';
import { toast } from 'react-toastify';
import { CreateUserDialog } from './CreateUserDialog';
import './StaffUsersListPage.scss';

export interface StaffUsersListPageProps {
  /** e.g. `/admin/users` or `/super-admin/users` */
  basePath: string;
  allowSuperAdminRole?: boolean;
}

export const StaffUsersListPage: React.FC<StaffUsersListPageProps> = ({
  basePath,
  allowSuperAdminRole = false,
}) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error(
          'You are not logged in to Supabase. Please log out and sign in again as an admin user.'
        );
      }

      const response = await supabaseApiService.getUsers();

      if (response.status === 'SUCCESS' && response.data) {
        setUsers(response.data);
        if (response.message?.includes('admin_get_users')) {
          toast.info(response.message);
        }
      } else {
        throw new Error(response.message || 'Failed to load users');
      }
    } catch (error: unknown) {
      console.error('Failed to load users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(0);
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          user.email?.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower) ||
          user.nationalId?.toLowerCase().includes(searchLower) ||
          user.role?.toLowerCase().includes(searchLower)
        );
      }),
    [users, searchTerm]
  );

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredUsers, page, rowsPerPage]
  );

  const columns: Column<User>[] = [
    {
      id: 'name',
      label: 'Name',
      minWidth: 150,
      format: (_value, row) =>
        row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A',
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
    },
    {
      id: 'role',
      label: 'Role',
      minWidth: 120,
      format: (value) => value || 'customer',
    },
    {
      id: 'phone',
      label: 'Phone',
      minWidth: 120,
      format: (value) => value || 'N/A',
    },
    {
      id: 'totalApplications',
      label: 'Applications',
      minWidth: 100,
      align: 'center',
      format: (value) => value || 0,
    },
    {
      id: 'membershipStatus',
      label: 'Membership',
      minWidth: 120,
      format: (value) => {
        const active = value === 'active';
        return (
          <Chip
            label={active ? 'Active' : value === 'inactive' ? 'Inactive' : 'None'}
            size="small"
            sx={{
              fontWeight: 600,
              backgroundColor: active ? 'rgba(0, 207, 162, 0.16)' : 'var(--light-grey)',
              color: active ? 'var(--blox-deep-green)' : 'var(--blox-black)',
              border: active
                ? '1px solid var(--blox-deep-green)'
                : '1px solid var(--blox-black)',
            }}
          />
        );
      },
    },
    {
      id: 'creditsBalance',
      label: 'Credits',
      minWidth: 100,
      align: 'right',
      format: (value) => {
        const credits = typeof value === 'number' ? value : 0;
        return (
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: credits > 0 ? 'var(--blox-black)' : 'var(--secondary-text)' }}
          >
            {credits.toLocaleString()}
          </Typography>
        );
      },
    },
    {
      id: 'createdAt',
      label: 'Joined',
      minWidth: 120,
      format: (value) => (value ? formatDateTable(value) : 'N/A'),
    },
  ];

  return (
    <Box className="users-list-page">
      <Box className="page-header">
        <Box>
          <Typography variant="h2" className="page-title">
            Users
          </Typography>
          <Typography variant="body2" className="page-subtitle">
            {filteredUsers.length} users · create accounts, search, and open a profile
          </Typography>
        </Box>
        <Box className="header-actions">
          <Button variant="secondary" onClick={loadUsers} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create user
          </Button>
        </Box>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          placeholder="Search users by name, email, phone, role, or ID..."
        />
      </Box>

      <Box className="table-section">
        {loading && users.length === 0 ? (
          <TableSkeleton rows={8} columns={6} />
        ) : !loading && filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            message={
              searchTerm
                ? 'Try a different search term.'
                : 'Create a user to get started.'
            }
          />
        ) : (
          <Table
            columns={columns}
            rows={paginatedUsers}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={filteredUsers.length}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            onRowClick={(row) =>
              navigate(`${basePath}/${encodeURIComponent(row.email)}`)
            }
          />
        )}
      </Box>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allowSuperAdminRole={allowSuperAdminRole}
        onCreated={(created) => {
          void loadUsers();
          navigate(`${basePath}/${encodeURIComponent(created.email)}`);
        }}
      />
    </Box>
  );
};
