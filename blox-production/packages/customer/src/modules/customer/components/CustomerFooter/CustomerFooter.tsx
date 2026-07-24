import React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import './CustomerFooter.scss';

export const CustomerFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <Box component="footer" className="customer-footer">
      <Box className="customer-footer__inner">
        <Typography variant="body2" className="customer-footer__brand">
          © {year} BLOX
        </Typography>
        <Box className="customer-footer__links">
          <MuiLink
            component={RouterLink}
            to="/customer/legal/privacy"
            className="customer-footer__link"
            underline="hover"
          >
            Privacy Policy
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to="/customer/legal/terms"
            className="customer-footer__link"
            underline="hover"
          >
            Terms &amp; Conditions
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to="/customer/legal/delete-data"
            className="customer-footer__link"
            underline="hover"
          >
            Delete data
          </MuiLink>
          <MuiLink
            component={RouterLink}
            to="/customer/legal/delete-account"
            className="customer-footer__link"
            underline="hover"
          >
            Delete account
          </MuiLink>
          <MuiLink
            href="mailto:support@blox.market"
            className="customer-footer__link"
            underline="hover"
          >
            support@blox.market
          </MuiLink>
        </Box>
      </Box>
    </Box>
  );
};
