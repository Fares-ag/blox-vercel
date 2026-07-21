import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * DRAFT legal placeholder — replace with counsel-approved Terms before public launch.
 */
export const TermsPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="overline" color="warning.main">
        DRAFT — Not final legal text
      </Typography>
      <Typography variant="h4" gutterBottom>
        Terms &amp; Conditions
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography paragraph>
          These Terms &amp; Conditions govern use of the BLOX customer platform for vehicle
          financing applications, document submission, and payments in Qatar.
        </Typography>
        <Typography paragraph>
          By creating an application or accepting these terms in the apply flow, you confirm that
          the information you provide is accurate and that you authorize BLOX and its partners to
          process your application and related payments.
        </Typography>
        <Typography paragraph>
          Payment processing is provided via SkipCash. Refunds, chargebacks, and disputes follow
          the payment provider and BLOX support procedures.
        </Typography>
        <Typography paragraph>
          Replace this draft with counsel-approved terms before opening the platform to the public.
        </Typography>
        <Typography component={RouterLink} to="/customer/legal/privacy" sx={{ display: 'block', mt: 2 }}>
          Privacy Policy
        </Typography>
        <Typography component={RouterLink} to="/customer/home" sx={{ display: 'block', mt: 1 }}>
          Back to home
        </Typography>
      </Paper>
    </Box>
  );
};

export default TermsPage;
