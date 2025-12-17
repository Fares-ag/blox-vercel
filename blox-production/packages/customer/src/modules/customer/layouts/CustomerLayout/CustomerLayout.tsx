import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { CustomerNav } from '../../components/CustomerNav/CustomerNav';
import './CustomerLayout.scss';

export const CustomerLayout: React.FC = () => {
  return (
    <Box className="customer-layout">
      <CustomerNav />
      <Box className="customer-content">
        <Outlet />
      </Box>
    </Box>
  );
};

