import React from 'react';
import { Box, Typography, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const LAST_UPDATED = 'July 2026';

/**
 * Public data-deletion instructions for Google Play Data safety
 * (delete some/all data without closing the account).
 * URL: /customer/legal/delete-data
 */
export const DeleteDataPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Request deletion of your BLOX data
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {LAST_UPDATED} · BLOX customer app and web portal
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography paragraph>
          This page explains how to ask BLOX to delete <strong>some or all</strong> of your personal
          data <strong>without closing your account</strong>. If you want to close the account
          entirely, use our{' '}
          <Typography
            component={RouterLink}
            to="/customer/legal/delete-account"
            sx={{ color: 'inherit', fontWeight: 600 }}
          >
            Delete account
          </Typography>{' '}
          page instead.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
          How to request data deletion
        </Typography>
        <Typography component="ol" sx={{ pl: 3, mb: 2 }}>
          <li>
            Email <strong>support@blox.market</strong> from the email address on your BLOX account.
          </li>
          <li>
            Subject: <strong>Data deletion request</strong>
          </li>
          <li>
            Tell us what you want deleted (for example: uploaded documents, phone number on profile,
            a specific application draft, or “all personal data that is not legally required”).
          </li>
          <li>
            Include your full name and registered phone number (if any) so we can verify the
            request.
          </li>
          <li>
            We will review and respond within <strong>30 days</strong>. You will get an email
            confirming what was deleted and what (if anything) must be retained.
          </li>
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Data we can usually delete while keeping your account
        </Typography>
        <List dense disablePadding sx={{ mb: 2 }}>
          {[
            'Optional profile fields you no longer want stored',
            'Document uploads that are not required for an active financing or legal obligation',
            'Draft applications that were never submitted / never contracted',
            'Support conversation content that is not needed for an open case',
            'Marketing preferences and non-essential notification settings',
          ].map((text) => (
            <ListItem key={text} sx={{ py: 0.25, display: 0 }}>
              <ListItemText primary={`• ${text}`} />
            </ListItem>
          ))}
        </List>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Data that may be kept (and why)
        </Typography>
        <Typography paragraph>
          Even if you keep your account, some information cannot be erased immediately when it is
          still needed for the service or required by law, for example:
        </Typography>
        <List dense disablePadding sx={{ mb: 2 }}>
          {[
            'Core account identifiers needed to sign in (email / auth record) while the account remains open',
            'Active or completed financing applications, contracts, and installment / payment records — retained for financial and legal record-keeping periods under Qatar rules',
            'Payment transaction records handled with SkipCash — subject to payment and accounting retention',
            'Security / fraud logs retained for a limited period',
          ].map((text) => (
            <ListItem key={text} sx={{ py: 0.25, display: 0 }}>
              <ListItemText primary={`• ${text}`} />
            </ListItem>
          ))}
        </List>
        <Typography paragraph>
          Retained records are restricted to necessary purposes (compliance, payments, fraud
          prevention) and are not used for marketing.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Contact
        </Typography>
        <Typography paragraph>
          Email: <strong>support@blox.market</strong>
        </Typography>
        <Typography paragraph>
          Related:{' '}
          <Typography component={RouterLink} to="/customer/legal/privacy" sx={{ color: 'inherit' }}>
            Privacy Policy
          </Typography>
          {' · '}
          <Typography
            component={RouterLink}
            to="/customer/legal/delete-account"
            sx={{ color: 'inherit' }}
          >
            Delete account
          </Typography>
        </Typography>
      </Paper>
    </Box>
  );
};

export default DeleteDataPage;
