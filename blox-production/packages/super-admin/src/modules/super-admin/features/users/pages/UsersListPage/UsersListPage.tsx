import React from 'react';
import { StaffUsersListPage } from '@shared/features/staff-users';

export const UsersListPage: React.FC = () => (
  <StaffUsersListPage basePath="/super-admin/users" allowSuperAdminRole />
);
