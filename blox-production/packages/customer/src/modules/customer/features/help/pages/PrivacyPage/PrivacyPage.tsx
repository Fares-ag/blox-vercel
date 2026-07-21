import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * DRAFT legal placeholder — replace with counsel-approved Privacy Policy before public launch.
 */
export const PrivacyPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="overline" color="warning.main">
        DRAFT — Not final legal text
      </Typography>
      <Typography variant="h4" gutterBottom>
        Privacy Policy
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography paragraph>
          BLOX collects personal data you submit during registration and financing applications
          (identity details, contact information, documents, and payment-related records) to
          operate the dealership financing platform.
        </Typography>
        <Typography paragraph>
          Data is stored in our Supabase-hosted database and document storage with access controlled
          by authentication and row-level security. Payment card data is handled by SkipCash; BLOX
          does not store full card numbers.
        </Typography>
        <Typography paragraph>
          You may contact support to request access or correction of your data subject to applicable
          Qatar law and operational requirements.
        </Typography>
        <Typography paragraph>
          Replace this draft with counsel-approved privacy text before opening the platform to the
          public.
        </Typography>
        <Typography component={RouterLink} to="/customer/legal/terms" sx={{ display: 'block', mt: 2 }}>
          Terms &amp; Conditions
        </Typography>
        <Typography component={RouterLink} to="/customer/home" sx={{ display: 'block', mt: 1 }}>
          Back to home
        </Typography>
      </Paper>
    </Box>
  );
};

export default PrivacyPage;
