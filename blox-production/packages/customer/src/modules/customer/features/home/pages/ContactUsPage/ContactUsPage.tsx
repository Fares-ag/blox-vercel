import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Send, Email, Phone, LocationOn } from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import { toast } from 'react-toastify';
import './ContactUsPage.scss';

const SUPPORT_TOPICS = [
  { value: 'application', label: 'Application inquiry' },
  { value: 'payment', label: 'Payment issue' },
  { value: 'ownership', label: 'Ownership / financing' },
  { value: 'technical', label: 'Technical support' },
  { value: 'other', label: 'Other' },
];

export const ContactUsPage: React.FC = () => {
  const [formData, setFormData] = useState({
    topic: '',
    subject: '',
    message: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.topic) next.topic = 'Please select a topic';
    if (!formData.subject || formData.subject.length < 5) {
      next.subject = 'Subject must be at least 5 characters';
    }
    if (!formData.message || formData.message.length < 10) {
      next.message = 'Message must be at least 10 characters';
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      next.email = 'Valid email is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const { supabaseApiService } = await import('@shared/services');

      await supabaseApiService.createNotification({
        userEmail: formData.email || 'support@blox.market',
        type: 'info',
        title: `Support Request: ${formData.topic}`,
        message: `From: ${formData.email || 'N/A'}\nPhone: ${formData.phone || 'N/A'}\n\nSubject: ${formData.subject}\n\nMessage: ${formData.message}`,
        link: '/admin/support',
      });

      if (formData.email) {
        await supabaseApiService.createNotification({
          userEmail: formData.email,
          type: 'success',
          title: 'Support Request Received',
          message: `We've received your request regarding "${formData.subject}". Our team will get back to you soon.`,
        });

        void supabaseApiService.triggerTransactionalEmail({
          to: formData.email,
          templateId: 'support_ack',
          data: {
            customerName: formData.email.split('@')[0],
            supportTopic: formData.subject,
          },
          userEmail: formData.email,
          idempotencyKey: `support_ack:${formData.email}:${Date.now()}`,
        });
      }

      toast.success('Your message has been sent. We will get back to you soon!');
      setFormData({ topic: '', subject: '', message: '', email: '', phone: '' });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send message. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="contact-us-page">
      <Box className="contact-hero">
        <Container maxWidth="lg">
          <Typography component="p" className="contact-brand">
            BLOX
          </Typography>
          <Typography variant="h1" className="contact-hero-title">
            Contact us
          </Typography>
          <Typography className="contact-hero-lead">
            Questions about ownership, applications, or payments—reach out and we’ll help.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" className="contact-body">
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Box className="contact-form-panel" component="form" onSubmit={handleSubmit}>
              <Typography variant="h2" className="contact-panel-title">
                Send a message
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                We typically respond within 24 hours (Sunday–Thursday). For urgent matters, call us.
              </Alert>

              <FormControl fullWidth error={!!errors.topic} sx={{ mb: 2.5 }}>
                <InputLabel>Topic</InputLabel>
                <Select
                  value={formData.topic}
                  label="Topic"
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                >
                  {SUPPORT_TOPICS.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.topic && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {errors.topic}
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                error={!!errors.subject}
                helperText={errors.subject}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                label="Phone (optional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                label="Message"
                multiline
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                error={!!errors.message}
                helperText={errors.message}
                sx={{ mb: 3 }}
              />
              <CustomButton variant="primary" type="submit" loading={submitting} startIcon={<Send />}>
                Send message
              </CustomButton>
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box className="contact-aside">
              <Typography variant="h2" className="contact-panel-title">
                Get in touch
              </Typography>

              <Box className="contact-row">
                <Phone className="contact-row-icon" />
                <Box>
                  <Typography className="contact-row-label">Phone</Typography>
                  <Typography className="contact-row-value">
                    <a href="tel:+97477887114">+974 7788 7114</a>
                  </Typography>
                </Box>
              </Box>
              <Box className="contact-row">
                <Email className="contact-row-icon" />
                <Box>
                  <Typography className="contact-row-label">Email</Typography>
                  <Typography className="contact-row-value">
                    <a href="mailto:support@blox.market">support@blox.market</a>
                  </Typography>
                </Box>
              </Box>
              <Box className="contact-row">
                <LocationOn className="contact-row-icon" />
                <Box>
                  <Typography className="contact-row-label">Location</Typography>
                  <Typography className="contact-row-value">Doha, Qatar</Typography>
                </Box>
              </Box>

              <Box className="contact-hours">
                <Typography className="contact-hours-title">Business hours</Typography>
                <Typography className="contact-hours-line">Sunday – Thursday: 8:00 AM – 6:00 PM</Typography>
                <Typography className="contact-hours-line">Saturday: 9:00 AM – 1:00 PM</Typography>
                <Typography className="contact-hours-line">Friday: Closed</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
