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

        <Section title="1. Data Controller">
          <Typography paragraph>
            BLOX ("we", "us") is the data controller responsible for the personal data collected
            through this Platform. [TO BE COMPLETED BY LEGAL COUNSEL — insert full legal name,
            commercial registration number, registered address in Qatar, and Data Protection
            Officer contact details as required by Qatar's Personal Data Protection Law (Law No. 13
            of 2016) and any applicable amendments.]
          </Typography>
        </Section>

        <Section title="2. Data We Collect">
          <Typography paragraph>
            We collect the following categories of personal data:
          </Typography>
          <Typography component="ul" sx={{ pl: 3 }}>
            <li>Identity data: full name, Qatar ID (QID), nationality, date of birth, gender</li>
            <li>Contact data: email address, phone number, postal address</li>
            <li>Financial data: employment information, salary details, bank information for
              financing assessment</li>
            <li>Documents: copies of ID, employment letters, and other KYC documents you
              upload</li>
            <li>Payment data: transaction records (card data is handled exclusively by SkipCash;
              BLOX does not store full card numbers)</li>
            <li>Usage data: IP address, browser type, pages visited, and access timestamps for
              security and audit purposes</li>
          </Typography>
        </Section>

        <Section title="3. How We Use Your Data">
          <Typography paragraph>
            We use your personal data to: (a) process and evaluate your financing application;
            (b) verify your identity in compliance with KYC/AML obligations; (c) manage your
            installment schedule and process payments; (d) communicate with you about your
            application status; (e) comply with legal and regulatory obligations in Qatar;
            (f) detect and prevent fraud and unauthorised access.
          </Typography>
          <Typography paragraph>
            [TO BE COMPLETED BY LEGAL COUNSEL — identify the legal basis for each processing
            purpose under Qatar law.]
          </Typography>
        </Section>

        <Section title="4. Data Storage &amp; Security">
          <Typography paragraph>
            Your data is stored on servers located in [TO BE COMPLETED BY LEGAL COUNSEL — confirm
            data residency location, e.g., Qatar or GCC region]. We implement row-level access
            controls, encrypted transport (TLS), and authentication requirements to protect your
            data. Documents are stored in a private, non-publicly accessible storage bucket.
          </Typography>
        </Section>

        <Section title="5. Payment Data">
          <Typography paragraph>
            Card and digital wallet payments are processed by SkipCash, a licensed payment service
            provider. BLOX does not store, transmit, or process full card numbers. Please review
            SkipCash's own privacy policy for information about how they handle your payment data.
          </Typography>
        </Section>

        <Section title="6. Data Retention">
          <Typography paragraph>
            We retain your personal data for as long as necessary to fulfil the purposes described
            in this Policy, and for a minimum period required by applicable Qatar law and financial
            regulations. [TO BE COMPLETED BY LEGAL COUNSEL — specify minimum retention periods for
            KYC, financial, and transaction records.]
          </Typography>
        </Section>

        <Section title="7. Your Rights">
          <Typography paragraph>
            Subject to applicable Qatar law, you may have the right to: access the personal data
            we hold about you; request correction of inaccurate data; request deletion of your data
            where it is no longer necessary for the purposes collected; object to processing; and
            lodge a complaint with the relevant data protection authority in Qatar.
          </Typography>
          <Typography paragraph>
            To exercise these rights, contact us at: support@blox.market
          </Typography>
        </Section>

        <Section title="8. Third-Party Services">
          <Typography paragraph>
            We use the following third-party services that may process your data: Supabase
            (database and authentication infrastructure), SkipCash (payment processing). Each
            third party is bound by data processing agreements and applicable data protection law.
          </Typography>
        </Section>

        <Section title="9. Changes to This Policy">
          <Typography paragraph>
            We may update this Policy from time to time. We will notify you of material changes via
            the Platform or by email. The "Last updated" date at the top of this page indicates
            when the most recent changes were made.
          </Typography>
        </Section>

        <Section title="10. Contact &amp; DPO">
          <Typography paragraph>
            For privacy enquiries or to exercise your data rights, contact:
            support@blox.market
          </Typography>
          <Typography paragraph>
            [TO BE COMPLETED BY LEGAL COUNSEL — add Data Protection Officer name and contact
            details if required under Qatar PDPPL.]
          </Typography>
        </Section>

        <Box sx={{ mt: 3 }}>
          <Typography component={RouterLink} to="/customer/legal/terms" sx={{ display: 'block', mb: 1 }}>
            Terms &amp; Conditions
          </Typography>
          <Typography component={RouterLink} to="/customer/home" sx={{ display: 'block' }}>
            Back to home
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default PrivacyPage;
