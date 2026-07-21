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

export const TermsPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        Terms &amp; Conditions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {LAST_UPDATED}
      </Typography>
      <Paper sx={{ p: 3 }}>

        <Section title="1. Introduction">
          <Typography paragraph>
            These Terms &amp; Conditions ("Terms") govern your access to and use of the BLOX
            customer platform ("Platform"), operated by BLOX ("Company", "we", "us"). By
            registering, submitting an application, or using any part of the Platform, you agree
            to be bound by these Terms. If you do not agree, do not use the Platform.
          </Typography>
        </Section>

        <Section title="2. Definitions">
          <Typography paragraph>
            <strong>Platform</strong> — the BLOX web and mobile application for vehicle financing
            in Qatar.
          </Typography>
          <Typography paragraph>
            <strong>Application</strong> — a financing request submitted by a Customer through the
            Platform.
          </Typography>
          <Typography paragraph>
            <strong>Installment Schedule</strong> — the agreed payment plan generated upon offer
            acceptance.
          </Typography>
          <Typography paragraph>
            <strong>SkipCash</strong> — the third-party payment processor used for card and digital
            wallet payments on the Platform.
          </Typography>
        </Section>

        <Section title="3. Service Description">
          <Typography paragraph>
            BLOX provides a digital platform to facilitate vehicle financing applications, document
            collection, offer review, contract signing, and installment payment management in
            Qatar. BLOX does not itself provide credit; financing decisions are made by partner
            financial institutions.
          </Typography>
          <Typography paragraph>
            [TO BE COMPLETED BY LEGAL COUNSEL — describe specific services, geographic scope, and
            any licensing or regulatory context applicable to operations in Qatar.]
          </Typography>
        </Section>

        <Section title="4. User Obligations">
          <Typography paragraph>
            You agree to: (a) provide accurate, complete, and current information in your
            Application and profile; (b) not impersonate any person or entity; (c) not use the
            Platform for unlawful purposes; (d) keep your login credentials confidential and notify
            us immediately of any unauthorised access.
          </Typography>
          <Typography paragraph>
            [TO BE COMPLETED BY LEGAL COUNSEL — add any additional obligations, age requirements,
            or eligibility criteria.]
          </Typography>
        </Section>

        <Section title="5. Application Process">
          <Typography paragraph>
            Submitting an Application does not guarantee financing approval. BLOX and its partners
            reserve the right to request additional documents, decline an Application, or revoke an
            offer at any stage prior to contract execution.
          </Typography>
        </Section>

        <Section title="6. Payment Terms">
          <Typography paragraph>
            Payments are processed via SkipCash (card / QPay) or bank transfer as indicated during
            checkout. You authorise BLOX and its payment partners to process the amounts shown in
            your Installment Schedule. Late payments may incur charges as specified in your
            contract.
          </Typography>
          <Typography paragraph>
            Refunds, chargebacks, and payment disputes follow the procedures of SkipCash and BLOX
            support. [TO BE COMPLETED BY LEGAL COUNSEL — specify refund policy, dispute
            resolution timeline, and relevant Qatar Central Bank or QFC requirements.]
          </Typography>
        </Section>

        <Section title="7. Document Requirements &amp; Storage">
          <Typography paragraph>
            You grant BLOX a non-exclusive licence to store and process documents uploaded to the
            Platform solely for the purpose of evaluating and administering your financing
            Application. Documents are stored in a private, access-controlled storage service and
            are not publicly accessible.
          </Typography>
        </Section>

        <Section title="8. Intellectual Property">
          <Typography paragraph>
            All content, trademarks, and software on the Platform are the property of BLOX or its
            licensors. You may not copy, reproduce, or distribute any part of the Platform without
            prior written consent.
          </Typography>
        </Section>

        <Section title="9. Limitation of Liability">
          <Typography paragraph>
            To the maximum extent permitted by applicable law, BLOX shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the Platform.
            [TO BE COMPLETED BY LEGAL COUNSEL — tailor to Qatar law requirements and any mandatory
            consumer protection provisions.]
          </Typography>
        </Section>

        <Section title="10. Governing Law">
          <Typography paragraph>
            These Terms are governed by and construed in accordance with the laws of the State of
            Qatar. Any disputes arising in connection with these Terms shall be subject to the
            exclusive jurisdiction of the competent courts of Qatar. [TO BE COMPLETED BY LEGAL
            COUNSEL — specify dispute resolution mechanism, arbitration clause if applicable, and
            QFC or QICDRC jurisdiction if relevant.]
          </Typography>
        </Section>

        <Section title="11. Changes to These Terms">
          <Typography paragraph>
            We may update these Terms from time to time. We will notify you of material changes via
            the Platform or by email. Continued use of the Platform after changes take effect
            constitutes your acceptance of the revised Terms.
          </Typography>
        </Section>

        <Section title="12. Contact">
          <Typography paragraph>
            For questions about these Terms, contact us at: support@blox.market
          </Typography>
        </Section>

        <Box sx={{ mt: 3 }}>
          <Typography component={RouterLink} to="/customer/legal/privacy" sx={{ display: 'block', mb: 1 }}>
            Privacy Policy
          </Typography>
          <Typography component={RouterLink} to="/customer/home" sx={{ display: 'block' }}>
            Back to home
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default TermsPage;
