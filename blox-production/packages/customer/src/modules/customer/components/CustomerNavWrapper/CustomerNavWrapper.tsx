import React from 'react';
import { Box } from '@mui/material';
import { CustomerNav } from '../CustomerNav/CustomerNav';
import './CustomerNavWrapper.scss';

interface CustomerNavWrapperProps {
  children: React.ReactNode;
}

export const CustomerNavWrapper: React.FC<CustomerNavWrapperProps> = ({ children }) => {
  return (
    <Box className="customer-nav-wrapper">
      <CustomerNav />
      <Box className="customer-content-wrapper">
        {children}
      </Box>
    </Box>
  );
};

