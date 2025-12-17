import React, { useState } from 'react';
import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore, Help } from '@mui/icons-material';
import './FAQPage.scss';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'General',
    question: 'What is Blox?',
    answer:
      'Blox is a vehicle financing platform that helps customers purchase vehicles through flexible installment plans.',
  },
  {
    category: 'General',
    question: 'How do I apply for vehicle financing?',
    answer:
      'Browse our vehicle catalog, select a vehicle, fill out the application form with your personal and financial information, upload required documents, and submit your application.',
  },
  {
    category: 'Application',
    question: 'What documents do I need to apply?',
    answer:
      'You will need: Qatar ID (front and back), salary certificate, bank statements, and any other documents as requested.',
  },
  {
    category: 'Application',
    question: 'How long does the approval process take?',
    answer:
      'Typically, applications are reviewed within 3-5 business days. You will be notified via email and SMS once a decision is made.',
  },
  {
    category: 'Payment',
    question: 'What payment methods are accepted?',
    answer:
      'We accept credit/debit cards and bank transfers. You can make payments directly through your application dashboard.',
  },
  {
    category: 'Payment',
    question: 'When are my monthly payments due?',
    answer:
      'Payment due dates are shown in your payment schedule. You can view your complete payment calendar in the Payment Calendar section.',
  },
  {
    category: 'Payment',
    question: 'Can I make early payments?',
    answer:
      'Yes, you can make payments ahead of schedule. Contact our support team if you wish to pay off your loan early.',
  },
  {
    category: 'Contracts',
    question: 'How do I sign the contract?',
    answer:
      'Once your application is approved, you will receive a contract to sign. You can sign it digitally through your application dashboard.',
  },
  {
    category: 'Contracts',
    question: 'Can I download my contract?',
    answer:
      'Yes, you can download your signed contract at any time from your application details page.',
  },
];

export const FAQPage: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const categories = Array.from(new Set(FAQ_DATA.map((item) => item.category)));

  return (
    <Box className="faq-page">
      <Box className="faq-header">
        <Help sx={{ fontSize: 64, color: '#00cfa2', mb: 2 }} />
        <Typography variant="h3" className="page-title">
          Frequently Asked Questions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find answers to common questions about our services
        </Typography>
      </Box>

      {categories.map((category) => (
        <Box key={category} className="category-section">
          <Typography variant="h5" className="category-title">
            {category}
          </Typography>
          <Paper className="faq-accordion">
            {FAQ_DATA.filter((item) => item.category === category).map((item, index) => (
              <Accordion
                key={index}
                expanded={expanded === `panel-${category}-${index}`}
                onChange={handleChange(`panel-${category}-${index}`)}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {item.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        </Box>
      ))}
    </Box>
  );
};


