import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const LAST_UPDATED = 'July 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    {children}
    <Divider sx={{ mt: 2 }} />
  </Box>
);

export const PrivacyPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {LAST_UPDATED}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Section title="1. Who we are">
          <Typography paragraph>
            BLOX (&quot;we&quot;, &quot;us&quot;) operates the BLOX customer web and mobile
            applications for vehicle financing in Qatar. We are the data controller for personal
            data collected through this Platform.
          </Typography>
          <Typography paragraph>
            Contact: support@blox.market
          </Typography>
        </Section>

        <Section title="2. Data we collect">
          <Typography paragraph>We collect the following categories of personal data:</Typography>
          <Typography component="ul" sx={{ pl: 3 }}>
            <li>
              <strong>Identity:</strong> full name, Qatar ID (QID), nationality, date of birth,
              gender
            </li>
            <li>
              <strong>Contact:</strong> email address, phone number, postal address
            </li>
            <li>
              <strong>Financial:</strong> employment information, salary details, and related
              information for financing assessment
            </li>
            <li>
              <strong>Documents:</strong> ID copies, employment letters, bank statements, and other
              KYC documents you upload
            </li>
            <li>
              <strong>Payment records:</strong> transaction status and amounts (card data is
              handled by SkipCash; BLOX does not store full card numbers)
            </li>
            <li>
              <strong>Technical:</strong> IP address, browser or app version, and access timestamps
              for security and support
            </li>
          </Typography>
        </Section>

        <Section title="3. How we use your data">
          <Typography paragraph>We use your personal data to:</Typography>
          <Typography component="ul" sx={{ pl: 3 }}>
            <li>Create and manage your account</li>
            <li>Process and evaluate vehicle financing applications</li>
            <li>Verify your identity in line with KYC / AML obligations</li>
            <li>Manage installment schedules and process payments</li>
            <li>Communicate about application status and support requests</li>
            <li>Detect and prevent fraud or unauthorised access</li>
            <li>Comply with legal and regulatory obligations in Qatar</li>
          </Typography>
        </Section>

        <Section title="4. Sharing">
          <Typography paragraph>
            We share data with authorised dealership partners, credit and underwriting partners,
            payment providers (SkipCash), and infrastructure providers (including Supabase) only as
            needed to provide the service. We do not sell your personal data.
          </Typography>
        </Section>

        <Section title="5. Storage &amp; security">
          <Typography paragraph>
            Data is transmitted over HTTPS / TLS. We use authentication and row-level access
            controls to protect your information. Document uploads are stored in private,
            non-public storage. We retain data for as long as needed to provide the service and as
            required by applicable Qatar law and financial record-keeping rules.
          </Typography>
        </Section>

        <Section title="6. Payment data">
          <Typography paragraph>
            Card and digital wallet payments are processed by SkipCash, a licensed payment service
            provider. BLOX does not store, transmit, or process full card numbers. Please review
            SkipCash&apos;s privacy policy for how they handle payment data.
          </Typography>
        </Section>

        <Section title="7. Your rights">
          <Typography paragraph>
            Subject to applicable Qatar law, you may request access to the personal data we hold
            about you, correction of inaccurate data, or deletion where the data is no longer
            necessary for the purposes collected. You may also lodge a complaint with the relevant
            data protection authority in Qatar.
          </Typography>
          <Typography paragraph>
            To request deletion of some or all personal data while keeping your account, see{' '}
            <Typography
              component={RouterLink}
              to="/customer/legal/delete-data"
              sx={{ color: 'inherit', fontWeight: 600 }}
            >
              Delete data
            </Typography>
            . To close your account entirely, see{' '}
            <Typography
              component={RouterLink}
              to="/customer/legal/delete-account"
              sx={{ color: 'inherit', fontWeight: 600 }}
            >
              Delete account
            </Typography>
            , or email support@blox.market.
          </Typography>
        </Section>

        <Section title="8. Children">
          <Typography paragraph>
            The Platform is intended for adults aged 18 and over. We do not knowingly collect
            personal data from children.
          </Typography>
        </Section>

        <Section title="9. Changes">
          <Typography paragraph>
            We may update this Policy from time to time. Material changes may be notified via the
            Platform or by email. The &quot;Last updated&quot; date at the top of this page shows when
            the most recent changes were made.
          </Typography>
        </Section>

        <Section title="10. Contact">
          <Typography paragraph>
            For privacy enquiries or to exercise your data rights: support@blox.market
          </Typography>
        </Section>

        <Box sx={{ mt: 3 }}>
          <Typography
            component={RouterLink}
            to="/customer/legal/terms"
            sx={{ display: 'block', mb: 1, color: 'inherit' }}
          >
            Terms &amp; Conditions
          </Typography>
          <Typography
            component={RouterLink}
            to="/customer/home"
            sx={{ display: 'block', color: 'inherit' }}
          >
            Back to home
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default PrivacyPage;
