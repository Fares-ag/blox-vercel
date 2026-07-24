import React from 'react';
import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { CustomerNav } from '../../components/CustomerNav/CustomerNav';
import { CustomerFooter } from '../../components/CustomerFooter/CustomerFooter';
import './CustomerLayout.scss';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const isDashboardPage = location.pathname === '/customer' || location.pathname === '/customer/dashboard';

  return (
    <Box className={`customer-layout ${!isDashboardPage ? 'with-green-background' : ''}`}>
      <CustomerNav />
      <Box className="customer-content">
        <Outlet />
      </Box>
      <CustomerFooter />
    </Box>
  );
};

