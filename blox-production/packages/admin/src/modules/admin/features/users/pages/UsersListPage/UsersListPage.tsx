import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabaseApiService } from '@shared/services';
import { supabase } from '@shared/services/supabase.service';
import type { User } from '@shared/models/user.model';
import { Table, type Column, SearchBar, Button, Loading } from '@shared/components';
import { formatDateTable } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import './UsersListPage.scss';

export const UsersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // If there's no Supabase session, admin-only RPCs will fail with 400/401.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You are not logged in to Supabase. Please log out and sign in again as an admin user.');
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
      console.error('❌ Failed to load users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(0);
  };

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user.nationalId?.toLowerCase().includes(searchLower)
    );
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns: Column<User>[] = [
    {
      id: 'name',
      label: 'Name',
      minWidth: 150,
      format: (_value, row) => row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A',
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
    },
    {
      id: 'phone',
      label: 'Phone',
      minWidth: 120,
      format: (value) => value || 'N/A',
    },
    {
      id: 'nationalId',
      label: 'National ID',
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
      id: 'activeApplications',
      label: 'Active',
      minWidth: 80,
      align: 'center',
      format: (value) => value || 0,
    },
    {
      id: 'membershipStatus',
      label: 'Membership',
      minWidth: 120,
      format: (value) => (
        <Chip
          label={value === 'active' ? 'Active' : value === 'inactive' ? 'Inactive' : 'None'}
          color={value === 'active' ? 'success' : value === 'inactive' ? 'default' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'createdAt',
      label: 'Joined',
      minWidth: 120,
      format: (value) => value ? formatDateTable(value) : 'N/A',
    },
  ];

  if (loading && users.length === 0) {
    return <Loading fullScreen message="Loading users..." />;
  }

  return (
    <Box className="users-list-page">
      <Box className="page-header">
        <Typography variant="h2">Users</Typography>
        <Box className="header-actions">
          <Button variant="primary" onClick={loadUsers}>
            Refresh
          </Button>
        </Box>
      </Box>

      <Box className="search-section">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={handleSearch}
          placeholder="Search users by name, email, phone, or ID..."
        />
      </Box>

      <Box className="table-section">
        <Table
          columns={columns}
          rows={paginatedUsers}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={filteredUsers.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRowClick={(row) => navigate(`/admin/users/${encodeURIComponent(row.email)}`)}
        />
      </Box>
    </Box>
  );
};

