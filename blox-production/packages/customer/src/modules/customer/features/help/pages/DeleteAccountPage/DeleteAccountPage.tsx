import React from 'react';
import { Box, Typography, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const LAST_UPDATED = 'July 2026';

/**
 * Public account-deletion instructions for Google Play Data safety.
 * URL: /customer/legal/delete-account
 */
export const DeleteAccountPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Delete your BLOX account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {LAST_UPDATED} · Applies to the BLOX customer app and web portal
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography paragraph>
          This page explains how to request deletion of your <strong>BLOX</strong> customer account
          and associated personal data. BLOX is a vehicle financing platform in Qatar.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
          How to request deletion
        </Typography>
        <Typography component="ol" sx={{ pl: 3, mb: 2 }}>
          <li>
            Email <strong>support@blox.market</strong> from the same email address registered on
            your BLOX account.
          </li>
          <li>
            Use the subject line: <strong>Account deletion request</strong>.
          </li>
          <li>
            Include your full name, registered phone number (if any), and confirm that you want your
            account and personal data deleted.
          </li>
          <li>
            We will verify the request and process it within <strong>30 days</strong> (or sooner
            where required by law). You will receive a confirmation email when deletion is complete.
          </li>
        </Typography>
        <Typography paragraph>
          You can also open this page from the BLOX customer website footer: Privacy Policy → related
          legal links, or go directly to this Delete account page.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Data that is deleted
        </Typography>
        <Typography paragraph>
          When your account deletion is completed, we delete or anonymise the following where it is
          tied to your user account:
        </Typography>
        <List dense disablePadding sx={{ mb: 2 }}>
          {[
            'Account profile (name, email, phone, and similar contact fields)',
            'Authentication credentials for the BLOX customer app / portal',
            'Personal details stored on your user profile (e.g. QID and related identity fields on the account)',
            'KYC / document uploads associated with draft or cancelled applications where retention is not legally required',
            'App preferences and notification settings linked to your account',
          ].map((text) => (
            <ListItem key={text} sx={{ py: 0.25, display: 0 }}>
              <ListItemText primary={`• ${text}`} />
            </ListItem>
          ))}
        </List>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Data that may be kept (and for how long)
        </Typography>
        <Typography paragraph>
          Some records cannot be fully erased immediately because of legal, accounting, fraud
          prevention, or financing obligations in Qatar. In those cases we retain only what is
          necessary, for example:
        </Typography>
        <List dense disablePadding sx={{ mb: 2 }}>
          {[
            'Completed or in-progress financing applications, contracts, and installment / payment records — retained for the period required by applicable financial and commercial record-keeping rules (typically up to several years after the relationship ends)',
            'Transaction identifiers and payment status shared with SkipCash — subject to the payment provider’s retention rules',
            'Security / audit logs needed to investigate fraud or abuse — retained for a limited period',
            'Information we must keep to comply with a legal obligation or establish / defend legal claims',
          ].map((text) => (
            <ListItem key={text} sx={{ py: 0.25, display: 0 }}>
              <ListItemText primary={`• ${text}`} />
            </ListItem>
          ))}
        </List>
        <Typography paragraph>
          Where we must retain records, we restrict access and stop using them for marketing or
          ordinary account operations.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Contact
        </Typography>
        <Typography paragraph>
          Email: <strong>support@blox.market</strong>
        </Typography>
        <Typography paragraph>
          See also our{' '}
          <Typography component={RouterLink} to="/customer/legal/privacy" sx={{ color: 'inherit' }}>
            Privacy Policy
          </Typography>{' '}
          and{' '}
          <Typography component={RouterLink} to="/customer/legal/terms" sx={{ color: 'inherit' }}>
            Terms &amp; Conditions
          </Typography>
          .
        </Typography>
      </Paper>
    </Box>
  );
};

export default DeleteAccountPage;
